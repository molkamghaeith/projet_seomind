import base64
import difflib
import re
import secrets
from datetime import datetime
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import redirect

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import GitHubToken


github_oauth_states = {}


# =========================================================
# HELPERS
# =========================================================

def sanitize_frontend_path(path: str, fallback="/dashboard") -> str:
    if not path or not path.startswith("/") or path.startswith("//"):
        return fallback
    return path


def add_query_param_to_path(path: str, key: str, value: str) -> str:
    parts = urlsplit(path)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query[key] = value
    return urlunsplit(("", "", parts.path or "/", urlencode(query), parts.fragment))

def get_github_headers(token: str):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def get_github_token_for_user(user):
    try:
        return user.github_token.access_token
    except GitHubToken.DoesNotExist:
        raise Exception("GitHub non connecté")


def revoke_github_token(access_token: str) -> tuple[bool, str]:
    response = requests.delete(
        f"https://api.github.com/applications/{settings.GITHUB_CLIENT_ID}/token",
        auth=(settings.GITHUB_CLIENT_ID, settings.GITHUB_CLIENT_SECRET),
        headers={
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        json={"access_token": access_token},
        timeout=30,
    )

    if response.status_code == 204:
        return True, "revoked"
    if response.status_code == 404:
        return True, "already_revoked"

    return False, f"github_status_{response.status_code}"


def build_branch_name(prefix="seo-fix"):
    now = datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"{prefix}-{now}"


def slugify(value: str, fallback="seo-fix") -> str:
    value = (value or fallback).lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:48] or fallback


def build_seo_branch_name(recommendation: dict):
    title = recommendation.get("title") if isinstance(recommendation, dict) else ""
    now = datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"seo-fix/{slugify(title) or 'recommendation'}-{now}"


def detect_fix_type(recommendation: dict, generated_fix: str) -> str:
    title = (recommendation.get("title") or "").lower()
    category = (recommendation.get("category") or "").lower()
    fix_lower = (generated_fix or "").lower()

    if "<title" in fix_lower or "titre" in title or category == "title":
        return "title"
    if "meta" in fix_lower or "meta" in title or category == "meta":
        return "meta"
    if "<h1" in fix_lower or "h1" in title or "structure" in category:
        return "h1"
    if "<img" in fix_lower or "image" in title:
        return "image_alt"
    if "liens internes" in title or "maillage" in title:
        return "internal_links"
    return "content"


def extract_tag_text(generated_fix: str, tag_name: str):
    match = re.search(
        rf"<{tag_name}[^>]*>(.*?)</{tag_name}>",
        generated_fix or "",
        re.IGNORECASE | re.DOTALL,
    )
    return match.group(1).strip() if match else ""


def get_file_extension(path: str):
    if "." not in path:
        return ""
    return path.rsplit(".", 1)[-1].lower()


def replace_or_insert_title(content: str, new_title: str) -> str:
    title_pattern = re.compile(r"<title>.*?</title>", re.IGNORECASE | re.DOTALL)
    title_tag = f"<title>{new_title}</title>"

    if title_pattern.search(content):
        return title_pattern.sub(title_tag, content, count=1)

    if "</head>" in content:
        return content.replace("</head>", f"  {title_tag}\n</head>", 1)

    return f"{title_tag}\n{content}"


def replace_or_insert_react_title(content: str, new_title: str) -> str:
    helmet_title_pattern = re.compile(
        r"<title>.*?</title>",
        re.IGNORECASE | re.DOTALL,
    )
    document_title_pattern = re.compile(
        r"document\.title\s*=\s*['\"`].*?['\"`]\s*;?",
        re.IGNORECASE | re.DOTALL,
    )

    if helmet_title_pattern.search(content):
        return helmet_title_pattern.sub(f"<title>{new_title}</title>", content, count=1)
    if document_title_pattern.search(content):
        return document_title_pattern.sub(f'document.title = "{new_title}";', content, count=1)

    return content + f'\n\n// SEOmind\nuseEffect(() => {{ document.title = "{new_title}"; }}, []);\n'


def replace_or_insert_meta_description(content: str, new_description: str) -> str:
    meta_pattern = re.compile(
        r'<meta\s+name=["\']description["\']\s+content=["\'].*?["\']\s*/?>',
        re.IGNORECASE | re.DOTALL,
    )

    meta_tag = f'<meta name="description" content="{new_description}">'

    if meta_pattern.search(content):
        return meta_pattern.sub(meta_tag, content, count=1)

    if "</head>" in content:
        return content.replace("</head>", f"  {meta_tag}\n</head>", 1)

    return f"{meta_tag}\n{content}"


def replace_or_insert_h1(content: str, new_h1: str) -> str:
    h1_pattern = re.compile(r"<h1\b[^>]*>.*?</h1>", re.IGNORECASE | re.DOTALL)
    h1_tag = f"<h1>{new_h1}</h1>"

    if h1_pattern.search(content):
        return h1_pattern.sub(h1_tag, content, count=1)

    return append_before_body_end(content, "\n" + h1_tag + "\n")


def add_alt_to_first_img_without_alt(content: str, alt_text: str) -> str:
    img_pattern = re.compile(r"<img\b(?![^>]*\balt=)([^>]*)>", re.IGNORECASE)

    def repl(match):
        attrs = match.group(1).strip()
        if attrs:
            return f'<img {attrs} alt="{alt_text}">'
        return f'<img alt="{alt_text}">'

    new_content, count = img_pattern.subn(repl, content, count=1)
    return new_content if count > 0 else content


def append_before_body_end(content: str, snippet: str) -> str:
    if "</body>" in content:
        return content.replace("</body>", f"{snippet}\n</body>", 1)

    return content + "\n" + snippet


def apply_generic_fix(content: str, recommendation: dict, generated_fix: str) -> str:
    title = (recommendation.get("title") or "").lower()
    message = (
        recommendation.get("message")
        or recommendation.get("description")
        or ""
    ).lower()

    fix_lower = generated_fix.lower()
    fix_type = detect_fix_type(recommendation, generated_fix)

    # 📁 FICHIER CIBLE POUR L'UTILISATEUR
    if fix_type in ["title", "meta"]:
        recommendation["target_file"] = "app/layout.tsx"
    elif fix_type == "h1":
        recommendation["target_file"] = "app/page.tsx"
    elif fix_type == "image_alt":
        recommendation["target_file"] = "le fichier qui contient l'image"
    else:
        recommendation["target_file"] = "à vérifier selon la page concernée"

    # 🟢 TITLE HTML
    if "<title>" in fix_lower:
        match = re.search(
            r"<title>(.*?)</title>",
            generated_fix,
            re.IGNORECASE | re.DOTALL,
        )
        if match:
            return replace_or_insert_title(content, match.group(1).strip())

    # 🟢 META HTML
    if 'meta name="description"' in fix_lower:
        match = re.search(
            r'content="(.*?)"',
            generated_fix,
            re.IGNORECASE | re.DOTALL,
        )
        if match:
            return replace_or_insert_meta_description(content, match.group(1).strip())

    # 🟢 H1
    if fix_type == "h1":
        extracted_h1 = extract_tag_text(generated_fix, "h1")
        if extracted_h1:
            return replace_or_insert_h1(content, extracted_h1)

    # 🟢 IMAGE ALT
    if "<img" in fix_lower and "alt=" in fix_lower:
        match = re.search(
            r'alt="(.*?)"',
            generated_fix,
            re.IGNORECASE | re.DOTALL,
        )
        alt_text = match.group(1).strip() if match else "Image descriptive"
        return add_alt_to_first_img_without_alt(content, alt_text)

    # 🟢 AUTRES
    return append_before_body_end(content, "\n" + generated_fix + "\n")

def apply_fix_to_file(content: str, file_path: str, recommendation: dict, generated_fix: str) -> tuple[str, str]:
    fix_type = detect_fix_type(recommendation, generated_fix)
    extension = get_file_extension(file_path)

    if extension in {"js", "jsx", "ts", "tsx"}:

        # ✅ NEXT.JS TITLE / META dans metadata
        if "export const metadata" in content:

            if fix_type == "title":
                match = re.search(
                    r'title:\s*["\'](.*?)["\']',
                    generated_fix,
                    re.IGNORECASE | re.DOTALL,
                )

                if match:
                    extracted_title = match.group(1).strip()

                    if "title:" in content:
                        return content, fix_type

                    return (
                        content.replace(
                            "export const metadata = {",
                            f'export const metadata = {{\n  title: "{extracted_title}",',
                            1
                        ),
                        fix_type
                    )

            if fix_type == "meta":
                match = re.search(
                    r'description:\s*["\'](.*?)["\']',
                    generated_fix,
                    re.IGNORECASE | re.DOTALL,
                )

                if match:
                    extracted_desc = match.group(1).strip()

                    if "description:" in content:
                        return content, fix_type

                    return (
                        content.replace(
                            "export const metadata = {",
                            f'export const metadata = {{\n  description: "{extracted_desc}",',
                            1
                        ),
                        fix_type
                    )

        # ✅ H1 dans le JSX, pas dans metadata
        if fix_type == "h1":
            extracted_h1 = extract_tag_text(generated_fix, "h1")

            if extracted_h1:
                if "<h1" in content.lower():
                    return content, fix_type

                if "return (\n    <>" in content:
                    return (
                        content.replace(
                            "return (\n    <>",
                            f"return (\n    <>\n      <h1>{extracted_h1}</h1>",
                            1
                        ),
                        fix_type
                    )

                if "return (\n  <>" in content:
                    return (
                        content.replace(
                            "return (\n  <>",
                            f"return (\n  <>\n    <h1>{extracted_h1}</h1>",
                            1
                        ),
                        fix_type
                    )

    return apply_generic_fix(content, recommendation, generated_fix), fix_type

def build_unified_diff(old_content: str, new_content: str, file_path: str) -> str:
    return "".join(
        difflib.unified_diff(
            old_content.splitlines(keepends=True),
            new_content.splitlines(keepends=True),
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
        )
    )


def fetch_github_file(headers, owner, repo, path, branch):
    response = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
        headers=headers,
        params={"ref": branch},
        timeout=30,
    )

    if response.status_code != 200:
        return None, Response(
            {
                "error": "Impossible de lire le fichier",
                "details": response.json(),
            },
            status=response.status_code,
        )

    data = response.json()
    encoded = data.get("content", "").replace("\n", "")
    decoded = base64.b64decode(encoded).decode("utf-8")
    return {
        "path": data.get("path"),
        "sha": data.get("sha"),
        "content": decoded,
    }, None


def build_commit_message(recommendation: dict, file_path: str):
    fix_type = detect_fix_type(recommendation, "")
    title = recommendation.get("title", "SEO")
    return f"fix(seo): apply {slugify(fix_type, 'seo')} recommendation in {file_path}"


def build_pull_request_body(recommendation: dict, file_path: str, fix_type: str, diff_text: str):
    return (
        "## Correction SEO\n\n"
        f"- Type : {fix_type}\n"
        f"- Priorité : {recommendation.get('priority', 'medium')}\n"
        f"- Fichier : `{file_path}`\n"
        f"- Recommandation : {recommendation.get('title', '')}\n\n"
        "## Détail\n\n"
        f"{recommendation.get('message', recommendation.get('description', ''))}\n\n"
        "## Aperçu du changement\n\n"
        "```diff\n"
        f"{diff_text[:5000]}\n"
        "```\n\n"
        "_Pull Request générée par SEOmind._"
    )


# =========================================================
# GITHUB OAUTH
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_login(request):
    state = secrets.token_urlsafe(16)

    next_path = sanitize_frontend_path(request.GET.get("next", "/dashboard"))

    github_oauth_states[state] = {
        "user_id": request.user.id,
        "next_path": next_path,
    }

    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "repo read:user",
        "state": state,
    }

    auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return Response({"auth_url": auth_url})


@api_view(["GET"])
def github_callback(request):
    code = request.GET.get("code")
    state = request.GET.get("state")

    if not code or not state:
        return JsonResponse({"error": "code ou state manquant"}, status=400)

    state_data = github_oauth_states.get(state)

    if not state_data:
        return JsonResponse({"error": "state invalide"}, status=400)

    user_id = state_data.get("user_id")
    next_path = sanitize_frontend_path(state_data.get("next_path", "/dashboard"))

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "Utilisateur introuvable"}, status=404)

    token_response = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "state": state,
        },
        timeout=30,
    )

    token_data = token_response.json()
    access_token = token_data.get("access_token")

    if not access_token:
        return JsonResponse(
            {
                "error": "Impossible de récupérer le token GitHub",
                "details": token_data,
            },
            status=400,
        )

    user_response = requests.get(
        "https://api.github.com/user",
        headers=get_github_headers(access_token),
        timeout=30,
    )

    user_data = user_response.json()

    GitHubToken.objects.update_or_create(
        user=user,
        defaults={
            "access_token": access_token,
            "github_username": user_data.get("login"),
        },
    )

    github_oauth_states.pop(state, None)

    callback_path = add_query_param_to_path(next_path, "github", "connected")
    return redirect(f"{settings.FRONTEND_URL}{callback_path}")


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def github_disconnect(request):
    try:
        token_obj = request.user.github_token
    except GitHubToken.DoesNotExist:
        return Response({
            "success": True,
            "github_disconnected": True,
            "revoked": False,
            "message": "GitHub est déjà déconnecté",
        })

    revoked = False
    revoke_status = "not_attempted"

    try:
        revoked, revoke_status = revoke_github_token(token_obj.access_token)
    except requests.RequestException:
        revoke_status = "github_unreachable"

    token_obj.delete()

    return Response({
        "success": True,
        "github_disconnected": True,
        "revoked": revoked,
        "revoke_status": revoke_status,
    })


# =========================================================
# REPOS / BRANCHES / FILE
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_repos(request):
    try:
        token = get_github_token_for_user(request.user)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

    response = requests.get(
        "https://api.github.com/user/repos?sort=updated&per_page=100",
        headers=get_github_headers(token),
        timeout=30,
    )

    if response.status_code != 200:
        return Response(
            {
                "error": "Impossible de charger les dépôts",
                "details": response.json(),
            },
            status=response.status_code,
        )

    repos = []

    for repo in response.json():
        repos.append({
            "id": repo["id"],
            "name": repo["name"],
            "full_name": repo["full_name"],
            "private": repo["private"],
            "default_branch": repo["default_branch"],
            "owner": repo["owner"]["login"],
        })

    return Response(repos)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_branches(request, owner, repo):
    try:
        token = get_github_token_for_user(request.user)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

    response = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/branches?per_page=100",
        headers=get_github_headers(token),
        timeout=30,
    )

    if response.status_code != 200:
        return Response(
            {
                "error": "Impossible de charger les branches",
                "details": response.json(),
            },
            status=response.status_code,
        )

    branches = [{"name": item["name"]} for item in response.json()]
    return Response(branches)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def github_get_file(request):
    try:
        token = get_github_token_for_user(request.user)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

    owner = request.data.get("owner")
    repo = request.data.get("repo")
    path = request.data.get("path")
    branch = request.data.get("branch")

    if not all([owner, repo, path, branch]):
        return Response(
            {"error": "owner, repo, path, branch sont obligatoires"},
            status=400,
        )

    response = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
        headers=get_github_headers(token),
        params={"ref": branch},
        timeout=30,
    )

    if response.status_code != 200:
        return Response(
            {
                "error": "Impossible de lire le fichier",
                "details": response.json(),
            },
            status=response.status_code,
        )

    data = response.json()
    encoded = data.get("content", "").replace("\n", "")
    decoded = base64.b64decode(encoded).decode("utf-8")

    return Response({
        "path": data.get("path"),
        "sha": data.get("sha"),
        "content": decoded,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def github_candidate_files(request, owner, repo):
    try:
        token = get_github_token_for_user(request.user)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

    branch = request.GET.get("branch")
    if not branch:
        return Response({"error": "branch est obligatoire"}, status=400)

    headers = get_github_headers(token)
    tree_res = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}",
        headers=headers,
        params={"recursive": "1"},
        timeout=30,
    )

    if tree_res.status_code != 200:
        return Response(
            {
                "error": "Impossible de scanner les fichiers du dépôt",
                "details": tree_res.json(),
            },
            status=tree_res.status_code,
        )

    preferred_names = {
        "index.html": 100,
        "src/pages/home.jsx": 95,
        "src/pages/home.tsx": 95,
        "src/app.jsx": 90,
        "src/app.tsx": 90,
        "src/main.jsx": 80,
        "src/main.tsx": 80,
        "app/page.jsx": 95,
        "app/page.tsx": 95,
        "pages/index.jsx": 95,
        "pages/index.tsx": 95,
        "templates/index.html": 90,
        "templates/home.html": 90,
    }
    valid_extensions = {"html", "jsx", "tsx", "js", "ts"}
    ignored_parts = {".git", "node_modules", "dist", "build", ".next", "coverage"}

    candidates = []
    for item in tree_res.json().get("tree", []):
        if item.get("type") != "blob":
            continue

        path = item.get("path", "")
        lower_path = path.lower()
        if any(part in lower_path.split("/") for part in ignored_parts):
            continue

        ext = get_file_extension(path)
        if ext not in valid_extensions:
            continue

        score = preferred_names.get(lower_path, 20)
        if "home" in lower_path or "index" in lower_path or "page" in lower_path:
            score += 20
        if "seo" in lower_path or "head" in lower_path or "layout" in lower_path:
            score += 15

        candidates.append({
            "path": path,
            "score": score,
            "type": ext,
        })

    candidates.sort(key=lambda item: item["score"], reverse=True)
    return Response(candidates[:25])


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def github_preview_fix(request):
    try:
        token = get_github_token_for_user(request.user)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

    owner = request.data.get("owner")
    repo = request.data.get("repo")
    base_branch = request.data.get("base_branch")
    file_path = request.data.get("file_path")
    recommendation = request.data.get("recommendation")
    generated_fix = request.data.get("generated_fix")

    if not all([owner, repo, base_branch, file_path, recommendation, generated_fix]):
        return Response(
            {
                "error": (
                    "owner, repo, base_branch, file_path, recommendation "
                    "et generated_fix sont obligatoires"
                )
            },
            status=400,
        )

    headers = get_github_headers(token)
    file_data, error_response = fetch_github_file(
        headers, owner, repo, file_path, base_branch
    )
    if error_response:
        return error_response

    new_content, fix_type = apply_fix_to_file(
        file_data["content"],
        file_path,
        recommendation,
        generated_fix,
    )

    if new_content == file_data["content"]:
        return Response(
            {
                "error": "La correction ne modifie pas ce fichier. Choisissez un autre fichier ou une autre recommandation.",
            },
            status=400,
        )

    diff_text = build_unified_diff(file_data["content"], new_content, file_path)

    return Response({
        "file_path": file_path,
        "fix_type": fix_type,
        "sha": file_data["sha"],
        "diff": diff_text,
        "old_content": file_data["content"],
        "new_content": new_content,
    })


# =========================================================
# CREATE BRANCH + PUSH FIX + PULL REQUEST
# =========================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def github_create_branch_and_pr(request):
    try:
        token = get_github_token_for_user(request.user)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

    owner = request.data.get("owner")
    repo = request.data.get("repo")
    base_branch = request.data.get("base_branch")
    file_path = request.data.get("file_path")
    recommendation = request.data.get("recommendation")
    generated_fix = request.data.get("generated_fix")
    previewed_content = request.data.get("previewed_content")

    if not all([owner, repo, base_branch, file_path, recommendation, generated_fix]):
        return Response(
            {
                "error": (
                    "owner, repo, base_branch, file_path, recommendation "
                    "et generated_fix sont obligatoires"
                )
            },
            status=400,
        )

    headers = get_github_headers(token)

    branch_res = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/git/ref/heads/{base_branch}",
        headers=headers,
        timeout=30,
    )

    if branch_res.status_code != 200:
        return Response(
            {
                "error": "Impossible de lire la branche source",
                "details": branch_res.json(),
            },
            status=branch_res.status_code,
        )

    base_sha = branch_res.json()["object"]["sha"]
    new_branch = build_seo_branch_name(recommendation)

    create_ref_res = requests.post(
        f"https://api.github.com/repos/{owner}/{repo}/git/refs",
        headers=headers,
        json={
            "ref": f"refs/heads/{new_branch}",
            "sha": base_sha,
        },
        timeout=30,
    )

    if create_ref_res.status_code not in [200, 201]:
        return Response(
            {
                "error": "Impossible de créer la branche",
                "details": create_ref_res.json(),
            },
            status=create_ref_res.status_code,
        )

    file_data, error_response = fetch_github_file(
        headers, owner, repo, file_path, base_branch
    )
    if error_response:
        return error_response

    current_sha = file_data["sha"]
    current_content = file_data["content"]

    if previewed_content:
        new_content = previewed_content
        fix_type = detect_fix_type(recommendation, generated_fix)
    else:
        new_content, fix_type = apply_fix_to_file(
            current_content,
            file_path,
            recommendation,
            generated_fix,
        )

    if new_content == current_content:
        return Response(
            {"error": "La correction ne modifie pas ce fichier."},
            status=400,
        )

    diff_text = build_unified_diff(current_content, new_content, file_path)

    encoded_content = base64.b64encode(
        new_content.encode("utf-8")
    ).decode("utf-8")

    update_res = requests.put(
        f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}",
        headers=headers,
        json={
            "message": build_commit_message(recommendation, file_path),
            "content": encoded_content,
            "sha": current_sha,
            "branch": new_branch,
        },
        timeout=30,
    )

    if update_res.status_code not in [200, 201]:
        return Response(
            {
                "error": "Impossible de mettre à jour le fichier",
                "details": update_res.json(),
            },
            status=update_res.status_code,
        )

    pr_res = requests.post(
        f"https://api.github.com/repos/{owner}/{repo}/pulls",
        headers=headers,
        json={
            "title": f"SEOmind fix: {recommendation.get('title', 'SEO improvement')}",
            "head": new_branch,
            "base": base_branch,
            "body": build_pull_request_body(recommendation, file_path, fix_type, diff_text),
        },
        timeout=30,
    )

    if pr_res.status_code not in [200, 201]:
        return Response(
            {
                "error": "Impossible de créer la pull request",
                "details": pr_res.json(),
            },
            status=pr_res.status_code,
        )

    pr_data = pr_res.json()

    return Response({
        "success": True,
        "branch_name": new_branch,
        "pull_request_url": pr_data.get("html_url"),
        "pull_request_number": pr_data.get("number"),
        "diff": diff_text,
    })
