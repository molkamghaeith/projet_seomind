from datetime import date, timedelta, datetime, timezone as datetime_timezone
from urllib.parse import urlencode, urlparse
import secrets
import requests
import random
import re

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.core import signing
from django.http import JsonResponse
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request as GoogleRequest
from .models import Website, Analysis
from .serializers import WebsiteSerializer
from accounts.models import GoogleAnalyticsToken
from .smart_seo_agent import SmartSEOAgent, get_smart_seo_recommendations
from .nlp_analyzer import SemanticAnalyzer
from .ga_utils import fetch_top_pages, fetch_organic_traffic, fetch_traffic_trend
from .export_utils import (
    export_seo_to_csv,
    export_analytics_to_csv,
    export_full_report_pdf,
)

GOOGLE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
GOOGLE_SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"

GOOGLE_SCOPES = [
    GOOGLE_ANALYTICS_SCOPE,
    GOOGLE_SEARCH_CONSOLE_SCOPE,
]
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"
GOOGLE_OAUTH_STATE_SALT = "google-analytics-oauth-state"
GOOGLE_OAUTH_STATE_MAX_AGE = 10 * 60

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


class GoogleReconnectionRequired(Exception):
    pass


# =========================================================
# HELPERS
# =========================================================

def parse_google_scopes(scope_value: str):
    return set((scope_value or "").split())


def get_missing_google_scopes(scope_value: str):
    return set(GOOGLE_SCOPES) - parse_google_scopes(scope_value)


def get_required_scopes_for_service(api_name: str):
    if api_name in {"analyticsadmin", "analyticsdata"}:
        return {GOOGLE_ANALYTICS_SCOPE}
    if api_name == "searchconsole":
        return {GOOGLE_SEARCH_CONSOLE_SCOPE}
    return set(GOOGLE_SCOPES)


def is_insufficient_scope_error(error: HttpError):
    content = getattr(error, "content", b"")
    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="ignore")
    content = str(content).lower()

    return getattr(error.resp, "status", None) in (401, 403) and (
        "access_token_scope_insufficient" in content
        or "insufficient authentication scopes" in content
    )


def normalize_site_url(site_url: str) -> str:
    if not site_url:
        return site_url

    site_url = site_url.strip()

    if not site_url.startswith("http://") and not site_url.startswith("https://"):
        site_url = "https://" + site_url

    if not site_url.endswith("/"):
        site_url += "/"

    return site_url


def get_token_object_for_user(user):
    return GoogleAnalyticsToken.objects.filter(user=user).first()


def clear_google_token_for_user(user):
    GoogleAnalyticsToken.objects.filter(user=user).delete()


def get_google_credentials_expiry(token_obj):
    expiry = token_obj.expiry
    if expiry and timezone.is_aware(expiry):
        return expiry.astimezone(datetime_timezone.utc).replace(tzinfo=None)
    return expiry


def build_google_credentials(user, required_scopes=None):
    token_obj = get_token_object_for_user(user)
    if not token_obj:
        raise Exception("Aucun compte Google connecté pour cet utilisateur.")

    missing_scopes = set(required_scopes or GOOGLE_SCOPES) - parse_google_scopes(token_obj.scopes)
    if missing_scopes:
        raise GoogleReconnectionRequired(
            "Connexion Google incomplete. Reconnectez Google Analytics pour autoriser l'acces aux proprietes."
        )

    credentials = Credentials(
        token=token_obj.access_token,
        refresh_token=token_obj.refresh_token,
        token_uri=GOOGLE_TOKEN_URI,
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=GOOGLE_SCOPES,
        expiry=get_google_credentials_expiry(token_obj),
    )

    if credentials.expired and credentials.refresh_token:
        credentials.refresh(GoogleRequest())
        token_obj.access_token = credentials.token
        if credentials.refresh_token:
            token_obj.refresh_token = credentials.refresh_token
        if credentials.expiry:
            token_obj.expiry = timezone.make_aware(
                credentials.expiry,
                datetime_timezone.utc,
            )
        token_obj.save()

    return credentials


def safe_build_service(api_name, version, user):
    credentials = build_google_credentials(
        user,
        required_scopes=get_required_scopes_for_service(api_name),
    )
    return build(api_name, version, credentials=credentials)


def sort_recommendations_by_priority(items):
    return sorted(items, key=lambda x: PRIORITY_ORDER.get(x.get("priority", "medium"), 99))


def build_simulated_search_console_data(site_url: str):
    domain = urlparse(normalize_site_url(site_url)).netloc.replace("www.", "")
    site_text = domain.replace("-", " ").replace(".", " ").lower()

    keyword_profiles = {
        "fitness": {
            "signals": ["gym", "fitness", "sport", "musculation", "coach"],
            "keywords": [
                "salle de sport",
                "coach sportif",
                "programme musculation",
                "fitness pres de moi",
                "entrainement personnalise",
            ],
        },
        "restaurant": {
            "signals": ["restaurant", "resto", "cafe", "food", "pizza", "menu"],
            "keywords": [
                "restaurant pres de moi",
                "meilleur restaurant",
                "reservation restaurant",
                "menu restaurant",
                "restaurant livraison",
            ],
        },
        "hotel": {
            "signals": ["hotel", "resort", "booking", "riad", "hostel", "suite"],
            "keywords": [
                "reservation hotel",
                "hotel pas cher",
                "hotel avec piscine",
                "meilleur hotel",
                "chambre hotel",
            ],
        },
        "ecommerce": {
            "signals": ["shop", "store", "boutique", "market", "vente", "ecommerce"],
            "keywords": [
                "acheter en ligne",
                "boutique en ligne",
                "livraison rapide",
                "meilleur prix",
                "promo en ligne",
            ],
        },
        "health": {
            "signals": ["clinic", "doctor", "medical", "dentiste", "sante", "cabinet"],
            "keywords": [
                "cabinet medical",
                "prendre rendez vous medecin",
                "clinique pres de moi",
                "consultation medicale",
                "specialiste sante",
            ],
        },
        "education": {
            "signals": ["school", "academy", "formation", "cours", "learn", "education"],
            "keywords": [
                "formation en ligne",
                "cours professionnel",
                "ecole privee",
                "apprendre en ligne",
                "certification formation",
            ],
        },
        "real_estate": {
            "signals": ["immo", "immobilier", "estate", "property", "appartement", "villa"],
            "keywords": [
                "appartement a vendre",
                "agence immobiliere",
                "location appartement",
                "maison a vendre",
                "investissement immobilier",
            ],
        },
        "agency": {
            "signals": ["agency", "agence", "digital", "marketing", "seo", "web"],
            "keywords": [
                "agence digitale",
                "creation site web",
                "agence marketing",
                "strategie digitale",
                "referencement seo",
            ],
        },
        "general": {
            "signals": [],
            "keywords": [
                "site officiel",
                "services professionnels",
                "contact entreprise",
                "avis clients",
                "devis gratuit",
            ],
        },
    }

    selected_profile = keyword_profiles["general"]
    for profile in keyword_profiles.values():
        if any(signal in site_text for signal in profile["signals"]):
            selected_profile = profile
            break

    base_keywords = [
        (selected_profile["keywords"][0], 6, 120, 7.8),
        (selected_profile["keywords"][1], 4, 95, 9.4),
        (selected_profile["keywords"][2], 5, 110, 10.1),
        (selected_profile["keywords"][3], 3, 70, 11.8),
        (selected_profile["keywords"][4], 2, 55, 12.6),
        (f"{domain} avis", 3, 40, 6.9),
        (f"{domain} contact", 2, 35, 8.4),
    ]

    simulated = []
    for keyword, clicks, impressions, position in base_keywords:
        ctr = round(clicks / impressions, 4) if impressions else 0
        simulated.append({
            "keyword": keyword,
            "clicks": clicks,
            "impressions": impressions,
            "ctr": ctr,
            "position": position,
            "is_simulated": True,
        })

    return simulated


def clean_site_name(site_url):
    domain = (
        site_url.replace("https://", "")
        .replace("http://", "")
        .replace("www.", "")
        .split("/")[0]
    )

    name = domain.split(".")[0]

    # mots inutiles + suffixes techniques
    useless_words = ["gamma", "beta", "app", "vercel", "netlify", "site", "web", "xi"]

    parts = [
        part for part in name.split("-")
        if part.lower() not in useless_words and len(part) > 2
    ]

    # fallback si tout est supprimé
    if not parts:
        parts = [name]

    cleaned_name = " ".join(word.capitalize() for word in parts)
    return cleaned_name.strip()
def infer_business_label(site_name: str, site_url: str) -> str:
    text = f"{site_name} {site_url}".lower()
    if "gym" in text or "fitness" in text or "sport" in text or "musculation" in text:
        return "Salle de sport moderne en Tunisie"
    if "restaurant" in text:
        return "Restaurant de qualité en Tunisie"
    if "hotel" in text:
        return "Hôtel confortable en Tunisie"
    return "Site web professionnel optimisé SEO"


def extract_related_terms(description: str) -> list[str]:
    terms = []

    quoted = re.findall(r"'([^']+)'", description)
    for q in quoted:
        if q and q.lower() not in [t.lower() for t in terms]:
            terms.append(q)

    mapping = [
        "gym sousse",
        "salle de sport sousse",
        "fitness tunisie",
        "musculation sousse",
        "coach sportif sousse",
    ]

    desc = description.lower()
    for item in mapping:
        if item in desc and item not in terms:
            terms.append(item)

    return terms[:5]


def random_choice_variant(variants):
    return random.choice(variants) if variants else ""


def build_correction_payload(correction_type, needs_fix, variants, message):
    clean_variants = []
    for variant in variants or []:
        if variant and variant not in clean_variants:
            clean_variants.append(variant)

    shuffled_variants = clean_variants[:]
    random.shuffle(shuffled_variants)

    return {
        "type": correction_type,
        "needs_fix": needs_fix,
        "code": shuffled_variants[0] if needs_fix and shuffled_variants else "",
        "variants": shuffled_variants if needs_fix else [],
        "message": message,
    }


def generate_title_variants(site_name: str, business_label: str):
    return [
        f"<title>{site_name} | {business_label}</title>",
        f"<title>{site_name} - Coaching, fitness et musculation en Tunisie</title>",
        f"<title>{site_name} | Fitness, bien-être et musculation à Sousse</title>",
        f"<title>{site_name} | Coaching sportif, fitness et bien-être</title>",
        f"<title>{site_name} - Salle de sport, coaching et programmes fitness</title>",
        f"<title>{site_name} | Atteignez vos objectifs fitness en Tunisie</title>",
    ]


def generate_meta_variants(site_name: str):
    return [
        f'<meta name="description" content="Découvrez {site_name}, une salle de sport moderne en Tunisie. Coaching, fitness, musculation et bien-être.">',
        f'<meta name="description" content="{site_name} vous accompagne dans vos objectifs fitness, musculation et bien-être en Tunisie.">',
        f'<meta name="description" content="Rejoignez {site_name} pour profiter d’un espace fitness moderne, d’un coaching personnalisé et d’un cadre motivant.">',
        f'<meta name="description" content="{site_name} propose coaching sportif, programmes fitness et accompagnement personnalisé pour progresser durablement.">',
        f'<meta name="description" content="Améliorez votre forme avec {site_name} : musculation, fitness, coaching et conseils adaptés à vos objectifs.">',
        f'<meta name="description" content="{site_name} vous accueille dans un espace dédié au fitness, au bien-être et à la performance sportive.">',
    ]


def generate_h1_variants(site_name: str):
    return [
        f"<h1>{site_name} – Votre salle de sport premium en Tunisie</h1>",
        f"<h1>{site_name} – Fitness, musculation et coaching personnalisé</h1>",
        f"<h1>Bienvenue chez {site_name}, votre espace fitness à Sousse</h1>",
        f"<h1>{site_name}, coaching sportif et fitness pour tous les niveaux</h1>",
        f"<h1>Atteignez vos objectifs forme avec {site_name}</h1>",
        f"<h1>{site_name}, votre partenaire fitness et bien-être</h1>",
    ]


def generate_image_variants(site_name: str):
    return [
        f'<img src="image.jpg" alt="{site_name} - Salle de sport moderne en Tunisie">',
        f'<img src="image.jpg" alt="{site_name} - Espace fitness et musculation à Sousse">',
        f'<img src="image.jpg" alt="{site_name} - Coaching sportif et bien-être en Tunisie">',
        f'<img src="image.jpg" alt="{site_name} - Entraînement fitness avec coach sportif">',
        f'<img src="image.jpg" alt="{site_name} - Équipements de musculation et espace cardio">',
        f'<img src="image.jpg" alt="{site_name} - Programme sportif personnalisé">',
    ]


def generate_content_snippets(site_name: str, terms: list[str]):
    related = ", ".join(terms) if terms else "fitness, musculation, coaching sportif, salle de sport"
    return [
        (
            "<section>\n"
            f"  <h2>Pourquoi choisir {site_name} ?</h2>\n"
            f"  <p>{site_name} propose un environnement moderne dédié au fitness, à la musculation et au coaching personnalisé. "
            f"Nos équipements, notre accompagnement et notre ambiance motivante permettent à chacun de progresser durablement.</p>\n"
            f"  <p>Pour enrichir cette page, intégrez naturellement des termes comme : {related}.</p>\n"
            "</section>"
        ),
        (
            "<section>\n"
            f"  <h2>{site_name}, votre référence bien-être</h2>\n"
            f"  <p>Notre salle accompagne les débutants et les sportifs confirmés grâce à des programmes adaptés, "
            f"un suivi professionnel et des espaces conçus pour le confort et la performance.</p>\n"
            f"  <p>Ajoutez des expressions liées à : {related} pour renforcer la pertinence sémantique.</p>\n"
            "</section>"
        ),
        (
            "<section>\n"
            f"  <h2>Des programmes fitness adaptes a vos objectifs</h2>\n"
            f"  <p>{site_name} aide chaque visiteur a trouver un parcours clair : remise en forme, musculation, "
            f"cardio, coaching sportif ou bien-etre. Cette section peut renforcer la confiance et la conversion.</p>\n"
            f"  <p>Mots-cles a integrer naturellement : {related}.</p>\n"
            "</section>"
        ),
        (
            "<section>\n"
            f"  <h2>Coaching, motivation et progression chez {site_name}</h2>\n"
            f"  <p>Presentez vos coachs, vos equipements, vos horaires et les resultats que vos membres peuvent attendre. "
            f"Un contenu plus precis aide Google et les visiteurs a comprendre votre valeur.</p>\n"
            f"  <p>Themes SEO utiles : {related}.</p>\n"
            "</section>"
        ),
    ]


def generate_internal_links_snippets():
    return [
        (
            "<nav>\n"
            '  <a href="/activites">Nos activités</a>\n'
            '  <a href="/tarifs">Nos tarifs</a>\n'
            '  <a href="/coaching">Coaching personnalisé</a>\n'
            '  <a href="/contact">Contact</a>\n'
            "</nav>"
        ),
        (
            "<section>\n"
            "  <p>Pages à relier entre elles pour améliorer le maillage interne :</p>\n"
            "  <ul>\n"
            "    <li>Accueil → Activités</li>\n"
            "    <li>Accueil → Tarifs</li>\n"
            "    <li>Activités → Coaching</li>\n"
            "    <li>Tarifs → Contact</li>\n"
            "  </ul>\n"
            "</section>"
        ),
        (
            "<nav aria-label=\"Liens principaux\">\n"
            '  <a href="/programmes">Programmes fitness</a>\n'
            '  <a href="/coach">Nos coachs</a>\n'
            '  <a href="/avis">Avis clients</a>\n'
            '  <a href="/contact">Demander un essai</a>\n'
            "</nav>"
        ),
        (
            "<section>\n"
            "  <h2>Liens utiles</h2>\n"
            "  <p>Découvrez aussi nos <a href=\"/activites\">activités</a>, "
            "nos <a href=\"/tarifs\">tarifs</a> et notre <a href=\"/coaching\">coaching personnalisé</a>.</p>\n"
            "</section>"
        ),
    ]


def generate_speed_snippets():
    return [
        (
            "<!-- Optimisation performance -->\n"
            '<link rel="preload" href="/images/hero.jpg" as="image">\n'
            '<img src="/images/hero.jpg" alt="Salle de sport" loading="lazy">'
        ),
        (
            "<!-- Conseils performance -->\n"
            "<!-- Compresser les images, réduire les scripts inutiles et activer le lazy loading -->"
        ),
        (
            "<!-- Optimisation images -->\n"
            '<img src="/images/hero.webp" alt="Salle de sport" width="1200" height="700" loading="eager" fetchpriority="high">\n'
            '<img src="/images/gallery.webp" alt="Espace fitness" width="800" height="500" loading="lazy">'
        ),
        (
            "<!-- Optimisation CSS critique -->\n"
            '<link rel="preload" href="/css/main.css" as="style">\n'
            '<link rel="stylesheet" href="/css/main.css">'
        ),
    ]


def generate_generic_variants(site_name: str):
    return [
        f"<!-- Optimisation recommandée pour {site_name} -->",
        f"<!-- Amélioration SEO suggérée pour {site_name} -->",
        f"<!-- Correction SEO proposée pour {site_name} -->",
        f"<!-- Ajoutez une section claire qui explique l'offre principale de {site_name}. -->",
        f"<!-- Renforcez le contenu SEO de {site_name} avec des mots-cles, des liens internes et un appel a l'action. -->",
    ]

def generate_simple_correction(title, description, site_url, rec_type=""):
    site_name = clean_site_name(site_url)
    business_label = infer_business_label(site_name, site_url)

    title_lower = (title or "").lower()
    description_lower = (description or "").lower()
    rec_type = (rec_type or "").lower()
    terms = extract_related_terms(description or "")

    try:
        response = requests.get(site_url, timeout=5)
        is_nextjs = "__NEXT_DATA__" in response.text or "/_next/" in response.text
    except Exception:
        is_nextjs = False

    if "pagespeed" in title_lower or "performance" in title_lower:
        return {
            "type": "advice",
            "needs_fix": False,
            "code": "",
            "message": "Optimisez les images, réduisez les fichiers JS/CSS et activez le lazy loading.",
        }

    if "score seo" in title_lower:
        return {
            "type": "advice",
            "needs_fix": False,
            "code": "",
            "message": "Le score SEO dépend de plusieurs facteurs (contenu, vitesse, mots-clés). Améliorez chaque partie séparément.",
        }

    # 🟢 TITRE
    if rec_type == "title" or "titre" in title_lower or "title" in title_lower:
        if is_nextjs:
            return {
                "type": "title",
                "needs_fix": True,
                "code": f'title: "{site_name} | {business_label}",',
                "variants": [
                    f'title: "{site_name} | {business_label}",',
                    f'title: "{site_name} - Coaching, fitness et musculation en Tunisie",',
                    f'title: "{site_name} | Fitness, bien-être et musculation à Sousse",',
                ],
                "message": "Ajoutez cette ligne dans le bloc metadata existant",
            }

        return build_correction_payload(
            "title",
            True,
            generate_title_variants(site_name, business_label),
            "Titre optimisé avec mots-clés SEO",
        )

    # 🟢 META
    if rec_type == "meta" or "meta" in title_lower:
        if is_nextjs:
            return {
                "type": "meta",
                "needs_fix": True,
                "code": f'description: "{site_name} vous accueille dans un espace dédié au fitness, au bien-être et à la performance sportive.",',
                "variants": [
                    f'description: "Découvrez {site_name}, une salle de sport moderne en Tunisie. Coaching, fitness, musculation et bien-être.",',
                    f'description: "{site_name} vous accompagne dans vos objectifs fitness, musculation et bien-être en Tunisie.",',
                    f'description: "Rejoignez {site_name} pour profiter d’un espace fitness moderne, d’un coaching personnalisé et d’un cadre motivant.",',
                ],
                "message": "Ajoutez cette ligne dans le bloc metadata existant",
            }

        return build_correction_payload(
            "meta",
            True,
            generate_meta_variants(site_name),
            "Meta description optimisée SEO",
        )

    # 🟢 H1
    if rec_type == "h1" or "h1" in title_lower:
        return build_correction_payload(
            "heading",
            True,
            generate_h1_variants(site_name),
            "H1 optimisé",
        )

    # 🟢 IMAGE
    if "image" in title_lower:
        if "toutes les images ont un attribut alt" in description_lower:
            return {
                "type": "image",
                "needs_fix": False,
                "code": "",
                "message": "Aucune correction nécessaire pour les images",
            }

        return build_correction_payload(
            "image",
            True,
            generate_image_variants(site_name),
            "Ajout d’attribut alt SEO",
        )

    # 🟢 CONTENU / SÉMANTIQUE
    if "pertinence sémantique" in title_lower or "termes connexes" in description_lower:
        return build_correction_payload(
            "content",
            True,
            generate_content_snippets(site_name, terms),
            "Ajoutez du contenu avec mots-clés liés",
        )

    if "contenu" in title_lower:
        if "contenu riche" in description_lower:
            return {
                "type": "content",
                "needs_fix": False,
                "code": "",
                "message": "Aucune correction nécessaire pour le contenu",
            }

        return build_correction_payload(
            "content",
            True,
            generate_content_snippets(site_name, terms),
            "Bloc de contenu recommandé",
        )

    # 🟢 LIENS
    if "liens internes" in title_lower:
        if "bon maillage" in description_lower:
            return {
                "type": "links",
                "needs_fix": False,
                "code": "",
                "message": "Maillage interne correct",
            }

        return build_correction_payload(
            "links",
            True,
            generate_internal_links_snippets(),
            "Ajoutez des liens internes",
        )

    # 🟢 PERFORMANCE
    if "temps de réponse" in title_lower:
        if "rapide" in description_lower:
            return {
                "type": "performance",
                "needs_fix": False,
                "code": "",
                "message": "Performance correcte",
            }

        return build_correction_payload(
            "performance",
            True,
            generate_speed_snippets(),
            "Optimisez la vitesse",
        )

    return build_correction_payload(
        "generic",
        True,
        generate_generic_variants(site_name),
        "Suggestion SEO générée",
    )
# =========================================================
# WEBSITE
# =========================================================
class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = attrs.get("username")

        users = User.objects.filter(email__iexact=email, is_active=True)

        if users.exists():
            if users.count() > 1:
                raise Exception("Plusieurs comptes utilisent cet email. Veuillez utiliser un email unique.")
            
            user = users.first()
            attrs["username"] = user.username

        return super().validate(attrs)


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
class WebsiteCreateView(generics.CreateAPIView):
    serializer_class = WebsiteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WebsiteListView(generics.ListAPIView):
    serializer_class = WebsiteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Website.objects.filter(user=self.request.user).order_by("-id")


class WebsiteDeleteView(generics.DestroyAPIView):
    serializer_class = WebsiteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Website.objects.filter(user=self.request.user)


# =========================================================
# AUTO FIX
# =========================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def auto_fix_recommendation(request, website_id):
    try:
        website = Website.objects.get(id=website_id, user=request.user)
    except Website.DoesNotExist:
        return Response({"error": "Site non trouvé"}, status=404)

    recommendation = request.data.get("recommendation")
    if not recommendation:
        return Response({"error": "Recommandation non fournie"}, status=400)

    title = recommendation.get("title", "")
    description = recommendation.get("message", recommendation.get("description", ""))
    rec_type = recommendation.get("recommendation_type", "")

    correction = generate_simple_correction(title, description, website.url, rec_type)

    # 🔥 Déterminer le fichier cible automatiquement
    target_file = ""

    if correction["type"] in ["title", "meta"]:
        target_file = "app/layout.tsx"  # Next.js metadata
    elif correction["type"] in ["heading"]:
        target_file = "app/page.tsx"
    elif correction["type"] == "image":
        target_file = "fichier contenant l'image (ex: page.tsx ou component)"
    elif correction["type"] == "content":
        target_file = "page principale (ex: app/page.tsx)"
    elif correction["type"] == "links":
        target_file = "navigation ou footer"
    elif correction["type"] == "performance":
        target_file = "layout ou head du projet"
    else:
        target_file = "à vérifier selon votre projet"

    return Response({
        "success": True,
        "message": correction["message"],
        "correction_type": correction["type"],
        "correction_code": correction["code"],
        "correction_variants": correction.get("variants", []),
        "needs_fix": correction["needs_fix"],

        # ✅ NOUVEAU
        "target_file": target_file,

        # ✅ Message UX amélioré
        "suggestion": (
            ""
            if not correction["needs_fix"]
            else f"Ajoutez ce code dans : {target_file}"
        ),
    })


# =========================================================
# GOOGLE OAUTH LOGIN
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def google_analytics_login(request):
    state = signing.dumps(
        {
            "user_id": request.user.id,
            "nonce": secrets.token_urlsafe(16),
        },
        salt=GOOGLE_OAUTH_STATE_SALT,
    )

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent select_account",
        "state": state,
    }

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return Response({"auth_url": auth_url})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def google_analytics_status(request):
    token_obj = get_token_object_for_user(request.user)

    if not token_obj or not token_obj.access_token:
        return Response({
            "connected": False,
            "has_refresh_token": False,
        })

    try:
        credentials = build_google_credentials(
            request.user,
            required_scopes={GOOGLE_ANALYTICS_SCOPE},
        )
    except GoogleReconnectionRequired as e:
        return Response({
            "connected": False,
            "has_refresh_token": bool(token_obj.refresh_token),
            "reconnect_required": True,
            "error": str(e),
        })
    except RefreshError:
        clear_google_token_for_user(request.user)
        return Response({
            "connected": False,
            "has_refresh_token": False,
            "reconnect_required": True,
            "error": "Connexion Google expirée. Reconnectez Google Analytics.",
        })
    except Exception as e:
        return Response({
            "connected": False,
            "has_refresh_token": bool(token_obj.refresh_token),
            "error": str(e),
        })

    return Response({
        "connected": bool(credentials and credentials.valid),
        "has_refresh_token": bool(token_obj.refresh_token),
    })


@api_view(["GET"])
def google_analytics_callback(request):
    code = request.GET.get("code")
    state = request.GET.get("state")

    if not code or not state:
        return JsonResponse({"error": "code ou state manquant"}, status=400)

    try:
        state_data = signing.loads(
            state,
            salt=GOOGLE_OAUTH_STATE_SALT,
            max_age=GOOGLE_OAUTH_STATE_MAX_AGE,
        )
        user_id = state_data.get("user_id")
    except signing.SignatureExpired:
        return JsonResponse({"error": "state expire"}, status=400)
    except signing.BadSignature:
        return JsonResponse({"error": "state invalide"}, status=400)

    if not user_id:
        return JsonResponse({"error": "state invalide"}, status=400)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "Utilisateur introuvable"}, status=404)

    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    response = requests.post(GOOGLE_TOKEN_URI, data=data)
    token_data = response.json()

    if "access_token" not in token_data:
        return JsonResponse(
            {"error": "Impossible de récupérer le token Google", "details": token_data},
            status=400,
        )

    granted_scopes = token_data.get("scope") or " ".join(GOOGLE_SCOPES)
    print("Google OAuth scopes granted:", granted_scopes)
    if GOOGLE_ANALYTICS_SCOPE not in parse_google_scopes(granted_scopes):
        clear_google_token_for_user(user)
        return redirect(f"{settings.FRONTEND_URL}/dashboard?google=scope_error")

    token_obj, created = GoogleAnalyticsToken.objects.get_or_create(user=user)
    token_obj.access_token = token_data.get("access_token")
    token_obj.token_uri = GOOGLE_TOKEN_URI
    token_obj.client_id = settings.GOOGLE_CLIENT_ID
    token_obj.client_secret = settings.GOOGLE_CLIENT_SECRET
    token_obj.scopes = granted_scopes

    refresh_token = token_data.get("refresh_token")
    if refresh_token:
        token_obj.refresh_token = refresh_token

    expires_in = token_data.get("expires_in")
    if expires_in:
        token_obj.expiry = timezone.now() + timedelta(seconds=int(expires_in))

    token_obj.save()
    return redirect(f"{settings.FRONTEND_URL}/dashboard?google=connected")

# =========================================================
# PROPERTIES
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_ga_properties(request):
    # Chaque utilisateur charge les propriétés de son propre compte Google.
    try:
        service = safe_build_service("analyticsadmin", "v1beta", request.user)
        result = service.accountSummaries().list().execute()

        properties = []

        for account in result.get("accountSummaries", []):
            for prop in account.get("propertySummaries", []):
                properties.append({
                    "property_id": prop.get("property", "").split("/")[-1],
                    "display_name": prop.get("displayName"),
                    "source": "google",
                })

        return Response(properties)

    except GoogleReconnectionRequired as e:
        return Response(
            {
                "error": str(e),
                "reconnect_required": True,
            },
            status=400,
        )

    except RefreshError:
        clear_google_token_for_user(request.user)

        return Response(
            {
                "error": "Connexion Google expirée. Reconnectez Google Analytics.",
                "reconnect_required": True,
            },
            status=400,
        )

    except Exception as e:
        if isinstance(e, HttpError) and is_insufficient_scope_error(e):
            clear_google_token_for_user(request.user)
            return Response(
                {
                    "error": "Connexion Google incomplete. Reconnectez Google Analytics pour autoriser l'acces aux proprietes.",
                    "reconnect_required": True,
                },
                status=400,
            )

        if isinstance(e, HttpError):
            return Response(
                {"error": f"Erreur Google Analytics Admin : {str(e)}"},
                status=400,
            )

        return Response(
            {"error": f"Erreur chargement proprietes : {str(e)}"},
            status=400,
        )


# =========================================================
# GOOGLE ANALYTICS DATA
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_ga_data(request, property_id):
    try:
        service = safe_build_service("analyticsdata", "v1beta", request.user)

        start_date_str = request.GET.get("start_date")
        end_date_str = request.GET.get("end_date")

        if not start_date_str or not end_date_str:
            end_date = date.today()
            start_date = end_date - timedelta(days=30)
            start_date_str = start_date.strftime("%Y-%m-%d")
            end_date_str = end_date.strftime("%Y-%m-%d")

        response = service.properties().runReport(
            property=f"properties/{property_id}",
            body={
                "dateRanges": [{"startDate": start_date_str, "endDate": end_date_str}],
                "dimensions": [{"name": "date"}],
                "metrics": [
                    {"name": "activeUsers"},
                    {"name": "sessions"},
                    {"name": "screenPageViews"},
                    {"name": "bounceRate"},
                ],
            },
        ).execute()

        data = []
        for row in response.get("rows", []):
            data.append({
                "date": row["dimensionValues"][0]["value"],
                "users": row["metricValues"][0]["value"],
                "sessions": row["metricValues"][1]["value"],
                "views": row["metricValues"][2]["value"],
                "bounceRate": row["metricValues"][3]["value"],
            })

        return Response(data)

    except Exception as e:
        return Response({"error": f"Erreur Analytics : {str(e)}"}, status=400)


# =========================================================
# VERIFY GA URL
# =========================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_ga_property_url(request):
    site_url = request.data.get("site_url")
    property_id = request.data.get("property_id")

    if not site_url or not property_id:
        return Response(
            {"error": "site_url et property_id sont obligatoires"},
            status=400,
        )

    try:
        service = safe_build_service("analyticsadmin", "v1beta", request.user)

        streams_response = service.properties().dataStreams().list(
            parent=f"properties/{property_id}"
        ).execute()

        site_domain = urlparse(site_url).netloc.replace("www.", "").lower()

        for stream in streams_response.get("dataStreams", []):
            web_stream_data = stream.get("webStreamData")
            if web_stream_data and web_stream_data.get("defaultUri"):
                default_uri = web_stream_data["defaultUri"]
                ga_domain = urlparse(default_uri).netloc.replace("www.", "").lower()

                if site_domain == ga_domain:
                    return Response({
                        "match": True,
                        "site_url": site_url,
                        "default_uri": default_uri,
                        "message": "La propriété GA correspond à l'URL du site."
                    })

        return Response({
            "match": False,
            "site_url": site_url,
            "message": "Cette propriété Google Analytics ne correspond pas à l'URL saisie."
        })

    except Exception as e:
        return Response(
            {"error": "Impossible de vérifier la propriété GA", "details": str(e)},
            status=400,
        )


# =========================================================
# SEARCH CONSOLE
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_search_console_data(request):
    site_url = request.GET.get("site_url")

    if not site_url:
        return JsonResponse({"error": "site_url manquant"}, status=400)

    site_url = normalize_site_url(site_url)

    start_date_str = request.GET.get("start_date")
    end_date_str = request.GET.get("end_date")

    try:
        service = safe_build_service("searchconsole", "v1", request.user)

        if start_date_str and end_date_str:
            start_date = start_date_str
            end_date = end_date_str
        else:
            end_date_obj = date.today()
            start_date_obj = end_date_obj - timedelta(days=90)
            start_date = str(start_date_obj)
            end_date = str(end_date_obj)

        response = service.searchanalytics().query(
            siteUrl=site_url,
            body={
                "startDate": start_date,
                "endDate": end_date,
                "dimensions": ["query"],
                "rowLimit": 10,
            }
        ).execute()

        rows = response.get("rows", [])

    except Exception as e:
        print("Erreur GSC :", e)
        rows = []

    if not rows:
        simulated = build_simulated_search_console_data(site_url)
        return Response(simulated)

    results = []
    for row in rows:
        results.append({
            "keyword": row["keys"][0],
            "clicks": row["clicks"],
            "impressions": row["impressions"],
            "ctr": row["ctr"],
            "position": row["position"],
            "is_simulated": False,
        })

    return JsonResponse(results, safe=False)


# =========================================================
# TOP PAGES
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_top_pages(request, property_id):
    start_date_str = request.GET.get("start_date")
    end_date_str = request.GET.get("end_date")
    limit = int(request.GET.get("limit", 10))

    start_date = None
    end_date = None

    if start_date_str:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    if end_date_str:
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()

    pages = fetch_top_pages(property_id, request.user, start_date, end_date, limit)
    return Response(pages)


# =========================================================
# ORGANIC TRAFFIC
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_organic_traffic(request, property_id):
    start_date_str = request.GET.get("start_date")
    end_date_str = request.GET.get("end_date")

    start_date = None
    end_date = None

    if start_date_str:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    if end_date_str:
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()

    users = fetch_organic_traffic(property_id, request.user, start_date, end_date)
    return Response({"organic_users": users})


# =========================================================
# TRAFFIC TREND
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_traffic_trend(request, property_id):
    days = int(request.GET.get("days", 30))
    trend = fetch_traffic_trend(property_id, request.user, days)
    return Response(trend)


# =========================================================
# SEO RECOMMENDATIONS
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_seo_recommendations_api(request, website_id):
    try:
        website = Website.objects.get(id=website_id, user=request.user)
    except Website.DoesNotExist:
        return Response({"error": "Site non trouvé"}, status=404)

    fast_mode = request.GET.get("fast") == "1"
    ga_data = []
    gsc_data = []

    try:
        service_ga = safe_build_service("analyticsdata", "v1beta", request.user)

        end_date_ga = date.today()
        start_date_ga = end_date_ga - timedelta(days=30)

        ga_response = service_ga.properties().runReport(
            property=f"properties/{website.property_id}",
            body={
                "dateRanges": [{
                    "startDate": start_date_ga.strftime("%Y-%m-%d"),
                    "endDate": end_date_ga.strftime("%Y-%m-%d"),
                }],
                "dimensions": [{"name": "date"}],
                "metrics": [
                    {"name": "activeUsers"},
                    {"name": "sessions"},
                    {"name": "screenPageViews"},
                ],
            },
        ).execute()

        for row in ga_response.get("rows", []):
            ga_data.append({
                "users": int(row["metricValues"][0]["value"]),
                "sessions": int(row["metricValues"][1]["value"]),
                "views": int(row["metricValues"][2]["value"]),
            })

    except Exception as e:
        print(f"Erreur GA pour recommandations: {e}")

    try:
        service_gsc = safe_build_service("searchconsole", "v1", request.user)

        end_date_gsc = date.today()
        start_date_gsc = end_date_gsc - timedelta(days=90)

        gsc_response = service_gsc.searchanalytics().query(
            siteUrl=normalize_site_url(website.url),
            body={
                "startDate": str(start_date_gsc),
                "endDate": str(end_date_gsc),
                "dimensions": ["query"],
                "rowLimit": 20,
            }
        ).execute()

        rows = gsc_response.get("rows", [])
        if not rows:
            gsc_data = build_simulated_search_console_data(website.url)
        else:
            for row in rows:
                gsc_data.append({
                    "keyword": row["keys"][0],
                    "clicks": row["clicks"],
                    "impressions": row["impressions"],
                    "ctr": row["ctr"],
                    "position": row["position"],
                    "is_simulated": False,
                })

    except Exception as e:
        print(f"Erreur GSC recommandations: {e}")
        gsc_data = build_simulated_search_console_data(website.url)

    top_pages_data = [] if fast_mode else fetch_top_pages(website.property_id, request.user, limit=10)
    recommendations = get_smart_seo_recommendations(
        website.url,
        ga_data,
        gsc_data,
        top_pages_data,
        fast_mode=fast_mode,
    )

    return Response(sort_recommendations_by_priority(recommendations))


# =========================================================
# EXPORT SEO CSV
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_seo_csv(request, website_id):
    try:
        website = Website.objects.get(id=website_id, user=request.user)
    except Website.DoesNotExist:
        return Response({"error": "Site non trouvé"}, status=404)

    try:
        service = safe_build_service("searchconsole", "v1", request.user)

        end_date = date.today()
        start_date = end_date - timedelta(days=90)

        response = service.searchanalytics().query(
            siteUrl=normalize_site_url(website.url),
            body={
                "startDate": str(start_date),
                "endDate": str(end_date),
                "dimensions": ["query"],
                "rowLimit": 100,
            }
        ).execute()

        rows = response.get("rows", [])
        if not rows:
            gsc_data = build_simulated_search_console_data(website.url)
        else:
            gsc_data = []
            for row in rows:
                gsc_data.append({
                    "keyword": row["keys"][0],
                    "clicks": row["clicks"],
                    "impressions": row["impressions"],
                    "ctr": row["ctr"],
                    "position": row["position"],
                    "is_simulated": False,
                })

        return export_seo_to_csv(gsc_data, website.nom_site)

    except Exception as e:
        return Response({"error": f"Erreur export SEO CSV : {str(e)}"}, status=400)


# =========================================================
# FORGOT PASSWORD
# =========================================================

@api_view(["POST"])
def forgot_password(request):
    email = request.data.get("email")

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "Utilisateur non trouvé"}, status=404)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

    send_mail(
        subject="Réinitialisation de votre mot de passe",
        message=(
            "Bonjour,\n\n"
            "Cliquez ici pour réinitialiser votre mot de passe :\n"
            f"{reset_link}\n\n"
            "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email."
        ),
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[email],
        fail_silently=False,
    )

    return Response({"message": "Email envoyé avec succès"})


# =========================================================
# EXPORT ANALYTICS CSV
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_analytics_csv(request, website_id):
    try:
        website = Website.objects.get(id=website_id, user=request.user)
    except Website.DoesNotExist:
        return Response({"error": "Site non trouvé"}, status=404)

    try:
        service = safe_build_service("analyticsdata", "v1beta", request.user)

        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        response = service.properties().runReport(
            property=f"properties/{website.property_id}",
            body={
                "dateRanges": [{
                    "startDate": start_date.strftime("%Y-%m-%d"),
                    "endDate": end_date.strftime("%Y-%m-%d"),
                }],
                "dimensions": [{"name": "date"}],
                "metrics": [
                    {"name": "activeUsers"},
                    {"name": "sessions"},
                    {"name": "screenPageViews"},
                ],
            },
        ).execute()

        ga_data = []
        for row in response.get("rows", []):
            ga_data.append({
                "date": row["dimensionValues"][0]["value"],
                "users": row["metricValues"][0]["value"],
                "sessions": row["metricValues"][1]["value"],
                "views": row["metricValues"][2]["value"],
            })

        return export_analytics_to_csv(ga_data, website.nom_site)

    except Exception as e:
        return Response({"error": f"Erreur export Analytics CSV : {str(e)}"}, status=400)


# =========================================================
# EXPORT FULL PDF
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_full_pdf(request, website_id):
    try:
        website = Website.objects.get(id=website_id, user=request.user)
    except Website.DoesNotExist:
        return Response({"error": "Site non trouvé"}, status=404)

    try:
        service_ga = safe_build_service("analyticsdata", "v1beta", request.user)
        service_gsc = safe_build_service("searchconsole", "v1", request.user)

        end_date = date.today()
        start_date_ga = end_date - timedelta(days=30)

        ga_response = service_ga.properties().runReport(
            property=f"properties/{website.property_id}",
            body={
                "dateRanges": [{
                    "startDate": start_date_ga.strftime("%Y-%m-%d"),
                    "endDate": end_date.strftime("%Y-%m-%d"),
                }],
                "dimensions": [{"name": "date"}],
                "metrics": [
                    {"name": "activeUsers"},
                    {"name": "sessions"},
                    {"name": "screenPageViews"},
                ],
            },
        ).execute()

        ga_data = []
        for row in ga_response.get("rows", []):
            ga_data.append({
                "date": row["dimensionValues"][0]["value"],
                "users": row["metricValues"][0]["value"],
                "sessions": row["metricValues"][1]["value"],
                "views": row["metricValues"][2]["value"],
            })

        start_date_gsc = end_date - timedelta(days=90)

        gsc_response = service_gsc.searchanalytics().query(
            siteUrl=normalize_site_url(website.url),
            body={
                "startDate": str(start_date_gsc),
                "endDate": str(end_date),
                "dimensions": ["query"],
                "rowLimit": 50,
            }
        ).execute()

        gsc_rows = gsc_response.get("rows", [])
        if not gsc_rows:
            gsc_data = build_simulated_search_console_data(website.url)
        else:
            gsc_data = []
            for row in gsc_rows:
                gsc_data.append({
                    "keyword": row["keys"][0],
                    "clicks": row["clicks"],
                    "impressions": row["impressions"],
                    "ctr": row["ctr"],
                    "position": row["position"],
                    "is_simulated": False,
                })

        return export_full_report_pdf(
            gsc_data,
            ga_data,
            website.nom_site,
            website.url,
        )

    except Exception as e:
        return Response({"error": f"Erreur export PDF : {str(e)}"}, status=400)


# =========================================================
# SEO ADVANCED ANALYSIS
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analyze_site_seo(request, website_id):
    from .seo_analyzer_advanced import analyze_website_seo

    try:
        website = Website.objects.get(id=website_id, user=request.user)
    except Website.DoesNotExist:
        return Response({"error": "Site non trouvé"}, status=404)

    try:
        results = analyze_website_seo(website.url)
        return Response(results)
    except Exception as e:
        return Response({"error": f"Erreur lors de l'analyse: {str(e)}"}, status=500)


# =========================================================
# SEMANTIC ANALYSIS
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def semantic_analysis(request, website_id):
    try:
        website = Website.objects.get(id=website_id, user=request.user)
    except Website.DoesNotExist:
        return Response({"error": "Site non trouvé"}, status=404)

    try:
        analyzer = SemanticAnalyzer()
    except Exception as e:
        return Response({"error": f"Erreur d'initialisation du modèle NLP: {str(e)}"}, status=500)

    target_keywords = request.GET.getlist("keywords")
    if not target_keywords:
        target_keywords = [
            "SEO",
            "optimisation",
            "trafic",
            "référencement",
            "moteur de recherche",
        ]

    try:
        results = analyzer.check_semantic_coverage(website.url, target_keywords)
        recommendations = analyzer.generate_seo_recommendations(website.url, target_keywords)
        content = analyzer.get_page_content(website.url)
        entities = analyzer.extract_key_entities(content) if content else {}

        return Response({
            "url": website.url,
            "site_name": website.nom_site,
            "analysis": results,
            "recommendations": recommendations,
            "entities": entities,
            "total_words": len(content.split()) if content else 0,
        })
    except Exception as e:
        return Response({"error": f"Erreur lors de l'analyse sémantique: {str(e)}"}, status=500)


# =========================================================
# SEO SCORE
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_seo_score(request, website_id):
    try:
        website = Website.objects.get(id=website_id, user=request.user)
    except Website.DoesNotExist:
        return Response({"error": "Site non trouvé"}, status=404)

    ga_data = []
    gsc_data = []

    try:
        service_ga = safe_build_service("analyticsdata", "v1beta", request.user)

        end_date = date.today()
        start_date = end_date - timedelta(days=30)

        response = service_ga.properties().runReport(
            property=f"properties/{website.property_id}",
            body={
                "dateRanges": [{
                    "startDate": start_date.strftime("%Y-%m-%d"),
                    "endDate": end_date.strftime("%Y-%m-%d"),
                }],
                "metrics": [
                    {"name": "activeUsers"},
                    {"name": "sessions"},
                    {"name": "screenPageViews"},
                ],
            },
        ).execute()

        for row in response.get("rows", []):
            ga_data.append({
                "users": int(row["metricValues"][0]["value"]),
                "sessions": int(row["metricValues"][1]["value"]),
                "views": int(row["metricValues"][2]["value"]),
            })

    except Exception as e:
        print("Erreur GA:", e)

    try:
        service_gsc = safe_build_service("searchconsole", "v1", request.user)

        response = service_gsc.searchanalytics().query(
            siteUrl=normalize_site_url(website.url),
            body={
                "startDate": str(date.today() - timedelta(days=90)),
                "endDate": str(date.today()),
                "dimensions": ["query"],
                "rowLimit": 20,
            }
        ).execute()

        rows = response.get("rows", [])
        if not rows:
            gsc_data = build_simulated_search_console_data(website.url)
        else:
            for row in rows:
                gsc_data.append({
                    "clicks": row["clicks"],
                    "impressions": row["impressions"],
                    "ctr": row["ctr"],
                    "position": row["position"],
                })

    except Exception as e:
        print("Erreur GSC:", e)
        gsc_data = build_simulated_search_console_data(website.url)

    agent = SmartSEOAgent(
        website.url,
        ga_data=ga_data,
        gsc_data=gsc_data,
        top_pages_data=[],
        fast_mode=True,
    )
    content_analysis = agent.analyze_content_vector()
    performance_analysis = agent.analyze_performance_stats()
    seo_analysis = agent.analyze_seo_correlations()

    _, soup = agent._fetch_page()
    if soup:
        agent.industry = agent.detect_industry(soup, soup.get_text())

    agent.generate_scores(
        content_analysis,
        performance_analysis,
        seo_analysis,
        agent.industry,
    )

    tech_tags_score = (
        content_analysis.get("has_canonical", 0) * 25 +
        content_analysis.get("has_schema", 0) * 25 +
        content_analysis.get("has_viewport", 0) * 25
    )
    load_time = content_analysis.get("load_time", 0)
    load_score = 25 if load_time < 1 else (18 if load_time < 2 else (10 if load_time < 3 else 3))

    score_global = round(agent.scores.get("global", 0), 2)
    technique_score = round(min(100, tech_tags_score + load_score), 2)
    contenu_score = round(agent.scores.get("content", 0), 2)
    visibilite_score = round(agent.scores.get("seo", 0), 2)
    trafic_score = round(agent.scores.get("performance", 0), 2)

    total_users = performance_analysis.get("total_users", 0)
    total_clicks = seo_analysis.get("total_clicks", 0)
    total_impressions = seo_analysis.get("total_impressions", 0)
    avg_ctr = seo_analysis.get("avg_ctr", 0)
    avg_position = seo_analysis.get("avg_position", 0)

    Analysis.objects.create(
        website=website,
        trafic=total_users,
        clics=total_clicks,
        impressions=total_impressions,
        ctr=avg_ctr,
        position=avg_position,
        score_technique=technique_score,
        score_contenu=contenu_score,
        score_visibilite=visibilite_score,
        score_trafic=trafic_score,
        score_global=score_global,
    )

    return Response({
        "score_global": score_global,
        "score_technique": technique_score,
        "score_contenu": contenu_score,
        "score_visibilite": visibilite_score,
        "score_trafic": trafic_score,
        "score_source": "smart_seo_agent",
    })


# =========================================================
# ANALYSIS HISTORY
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_analysis_history(request, website_id):
    try:
        website = Website.objects.get(id=website_id, user=request.user)
    except Website.DoesNotExist:
        return Response({"error": "Site non trouvé"}, status=404)

    analyses = Analysis.objects.filter(website=website).order_by("-date_analyse")

    data = []
    for a in analyses:
        data.append({
            "date": a.date_analyse,
            "score_global": round(a.score_global, 2),
            "score_technique": round(a.score_technique, 2),
            "score_contenu": round(a.score_contenu, 2),
            "score_visibilite": round(a.score_visibilite, 2),
            "score_trafic": round(a.score_trafic, 2),
            "trafic": a.trafic,
            "clics": a.clics,
            "impressions": a.impressions,
            "ctr": a.ctr,
            "position": a.position,
        })

    return Response(data)


# =========================================================
# SEO OPPORTUNITIES
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_seo_opportunities(request, website_id):
    try:
        website = Website.objects.get(id=website_id, user=request.user)
    except Website.DoesNotExist:
        return Response({"error": "Site non trouvé"}, status=404)

    opportunities = []
    gsc_data = []
    top_pages_data = []

    try:
        service_gsc = safe_build_service("searchconsole", "v1", request.user)

        end_date = date.today()
        start_date = end_date - timedelta(days=90)

        gsc_response = service_gsc.searchanalytics().query(
            siteUrl=normalize_site_url(website.url),
            body={
                "startDate": str(start_date),
                "endDate": str(end_date),
                "dimensions": ["query"],
                "rowLimit": 50,
            }
        ).execute()

        rows = gsc_response.get("rows", [])
        if not rows:
            gsc_data = build_simulated_search_console_data(website.url)
        else:
            for row in rows:
                gsc_data.append({
                    "keyword": row["keys"][0],
                    "clicks": row["clicks"],
                    "impressions": row["impressions"],
                    "ctr": row["ctr"],
                    "position": row["position"],
                    "is_simulated": False,
                })

    except Exception as e:
        print(f"Erreur GSC opportunités: {e}")
        gsc_data = build_simulated_search_console_data(website.url)

    try:
        if website.property_id:
            top_pages_data = fetch_top_pages(website.property_id, request.user, limit=10)
    except Exception as e:
        print(f"Erreur top pages opportunités: {e}")

    for item in gsc_data:
        keyword = item["keyword"]
        clicks = item["clicks"]
        impressions = item["impressions"]
        ctr = item["ctr"]
        position = item["position"]

        if impressions >= 100 and ctr < 0.03:
            opportunities.append({
                "type": "ctr_opportunity",
                "title": f"Améliorer le CTR du mot-clé '{keyword}'",
                "description": (
                    f"Le mot-clé '{keyword}' génère {impressions} impressions mais un CTR faible "
                    f"({round(ctr * 100, 2)}%). Il faut optimiser le title et la meta description."
                ),
                "priority": "high",
                "impact": "high",
                "difficulty": "medium",
                "category": "opportunity",
            })

        if position > 8 and position <= 20 and impressions >= 50:
            opportunities.append({
                "type": "ranking_opportunity",
                "title": f"Faire progresser le mot-clé '{keyword}'",
                "description": (
                    f"Le mot-clé '{keyword}' est en position moyenne {round(position, 2)} avec "
                    f"{impressions} impressions. Une optimisation de contenu pourrait le faire "
                    f"monter en première page."
                ),
                "priority": "medium",
                "impact": "high",
                "difficulty": "medium",
                "category": "opportunity",
            })

        if impressions >= 80 and clicks <= 2:
            opportunities.append({
                "type": "visibility_wasted",
                "title": f"Visibilité non convertie pour '{keyword}'",
                "description": (
                    f"Le mot-clé '{keyword}' apparaît souvent ({impressions} impressions) "
                    f"mais génère très peu de clics ({clicks}). Il y a une opportunité SEO à exploiter."
                ),
                "priority": "medium",
                "impact": "medium",
                "difficulty": "easy",
                "category": "opportunity",
            })

    for page in top_pages_data:
        views = page.get("views", 0)
        title = page.get("title", "")
        if views >= 10:
            opportunities.append({
                "type": "top_page_optimization",
                "title": f"Optimiser la page populaire '{title[:40]}'",
                "description": (
                    f"La page '{title}' reçoit {views} vues. C'est une page prioritaire pour "
                    f"ajouter du contenu SEO, renforcer les mots-clés et améliorer les conversions."
                ),
                "priority": "medium",
                "impact": "high",
                "difficulty": "medium",
                "category": "opportunity",
            })

    seen = set()
    unique_opportunities = []
    for opp in opportunities:
        key = opp["title"]
        if key not in seen:
            seen.add(key)
            unique_opportunities.append(opp)

    unique_opportunities = sort_recommendations_by_priority(unique_opportunities)

    return Response({
        "website": {
            "id": website.id,
            "nom_site": website.nom_site,
            "url": website.url,
        },
        "count": len(unique_opportunities),
        "opportunities": unique_opportunities
    })
