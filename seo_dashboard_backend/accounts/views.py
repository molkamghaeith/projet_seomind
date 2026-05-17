from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import InvalidToken

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google.auth.exceptions import RefreshError

from .serializers import RegisterSerializer
from analytics_app.models import Website


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # ✅ Créer l'utilisateur mais désactivé par défaut
        user = User.objects.create_user(
            username=serializer.validated_data['username'],
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            is_active=False
        )
        
        return Response(
            {"message": "Compte créé. En attente d'activation par l'administrateur."},
            status=status.HTTP_201_CREATED
        )


# ✅ Vue de connexion personnalisée
class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        email = request.data.get("username")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"error": "Email et mot de passe requis."},
                status=400
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Email ou mot de passe incorrect."},
                status=401
            )

        if not user.is_active:
            return Response(
                {"error": "Votre compte est en attente d'activation par l'administrateur."},
                status=401
            )

        data = request.data.copy()
        data["username"] = user.username
        data["password"] = password

        serializer = self.get_serializer(data=data)

        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            return Response(
                {"error": "Email ou mot de passe incorrect."},
                status=401
            )

        return Response(serializer.validated_data, status=200)

@api_view(["POST"])
@permission_classes([AllowAny])
def google_auth(request):
    credential = request.data.get("credential")

    if not credential:
        return Response({"error": "credential manquant"}, status=400)

    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_WEB_CLIENT_ID,
        )
    except Exception as e:
        return Response(
            {"error": f"Token Google invalide: {str(e)}"},
            status=400,
        )

    email = idinfo.get("email")
    given_name = idinfo.get("given_name", "")

    if not email:
        return Response({"error": "Email Google introuvable"}, status=400)

    username_base = email.split("@")[0]
    username = username_base

    user = User.objects.filter(email=email).first()

    if not user:
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{username_base}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=given_name,
            password=None,
            is_active=False
        )
        user.set_unusable_password()
        user.save()

    if not user.is_active:
        return Response(
            {"error": "Votre compte est en attente d'activation par l'administrateur."},
            status=401
        )

    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_superuser": user.is_superuser,
            },
        },
        status=200,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get("email")

    if not email:
        return Response({"error": "Email requis"}, status=400)

    user = User.objects.filter(email=email).first()

    if not user:
        return Response(
            {"message": "Si cet email existe, un lien a été généré."},
            status=200,
        )

    if not user.is_active:
        return Response(
            {"error": "Ce compte est en attente d'activation. Veuillez contacter l'administrateur."},
            status=400,
        )

    if not user.has_usable_password():
        return Response(
            {"error": "Ce compte utilise Google. Connectez-vous avec Google."},
            status=400,
        )

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

    send_mail(
        subject="Réinitialisation du mot de passe",
        message=f"Cliquez sur ce lien pour réinitialiser votre mot de passe : {reset_link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

    return Response(
        {"message": "Email de réinitialisation envoyé avec succès."},
        status=200,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password_confirm(request):
    uidb64 = request.data.get("uid")
    token = request.data.get("token")
    password = request.data.get("password")

    if not uidb64 or not token or not password:
        return Response({"error": "uid, token et password sont requis"}, status=400)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except Exception:
        return Response({"error": "Lien invalide"}, status=400)

    if not default_token_generator.check_token(user, token):
        return Response({"error": "Token invalide ou expiré"}, status=400)

    user.set_password(password)
    user.save()

    return Response({"message": "Mot de passe réinitialisé avec succès"}, status=200)


# ================= ADMIN FUNCTIONS =================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_role(request):
    user = request.user

    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_superuser": user.is_superuser,
        "is_staff": user.is_staff,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_get_users(request):
    """Récupérer tous les utilisateurs (admin uniquement)"""
    if not request.user.is_superuser:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    users = User.objects.all().order_by('-date_joined')
    data = []
    for user in users:
        data.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_active": user.is_active,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "date_joined": user.date_joined.strftime("%Y-%m-%d %H:%M"),
            "last_login": user.last_login.strftime("%Y-%m-%d %H:%M") if user.last_login else None,
        })
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_create_user(request):
    """Créer un nouvel utilisateur (admin uniquement)"""
    if not request.user.is_superuser:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")
    first_name = request.data.get("first_name", "")
    last_name = request.data.get("last_name", "")
    is_active = request.data.get("is_active", True)
    
    if not username or not email or not password:
        return Response({"error": "Username, email et mot de passe requis"}, status=400)
    
    if User.objects.filter(username=username).exists():
        return Response({"error": "Ce nom d'utilisateur existe déjà"}, status=400)
    
    if User.objects.filter(email=email).exists():
        return Response({"error": "Cet email existe déjà"}, status=400)
    
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_active=is_active
    )
    
    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "date_joined": user.date_joined,
    }, status=status.HTTP_201_CREATED)
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user

    username = request.data.get("username")
    email = request.data.get("email")

    if not username or not email:
        return Response(
            {"error": "Nom d'utilisateur et email sont obligatoires."},
            status=400
        )

    if User.objects.exclude(id=user.id).filter(username=username).exists():
        return Response(
            {"error": "Ce nom d'utilisateur existe déjà."},
            status=400
        )

    if User.objects.exclude(id=user.id).filter(email__iexact=email).exists():
        return Response(
            {"error": "Cet email existe déjà."},
            status=400
        )

    user.username = username
    user.email = email
    user.save()

    return Response({
        "message": "Profil modifié avec succès.",
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_superuser": user.is_superuser,
        "is_staff": user.is_staff,
    })

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def admin_update_user(request, user_id):
    """Modifier un utilisateur (activation/désactivation)"""
    if not request.user.is_superuser:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "Utilisateur non trouvé"}, status=404)
    
    if user.id == request.user.id:
        return Response({"error": "Vous ne pouvez pas modifier votre propre compte"}, status=400)
    
    username = request.data.get("username")
    email = request.data.get("email")
    is_active = request.data.get("is_active")
    is_staff = request.data.get("is_staff")
    is_superuser = request.data.get("is_superuser")

    if username is not None:
        username = username.strip()
        if not username:
            return Response({"error": "Le nom d'utilisateur est requis"}, status=400)
        if User.objects.exclude(id=user.id).filter(username__iexact=username).exists():
            return Response({"error": "Ce nom d'utilisateur existe déjà"}, status=400)
        user.username = username

    if email is not None:
        email = email.strip()
        if not email:
            return Response({"error": "L'email est requis"}, status=400)
        if User.objects.exclude(id=user.id).filter(email__iexact=email).exists():
            return Response({"error": "Cet email existe déjà"}, status=400)
        user.email = email

    was_active = user.is_active
    
    if is_active is not None:
        user.is_active = is_active
        user.save()
        
        # Envoyer un email d'activation
        if is_active and not was_active:
            try:
                send_mail(
                    subject="✅ Votre compte SEOmind a été activé",
                    message=f"""
Bonjour {user.username},

Votre compte sur la plateforme SEOmind a été activé par l'administrateur.

Connectez-vous ici : {settings.FRONTEND_URL}

Cordialement,
L'équipe SEOmind
                    """,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except:
                pass

    if is_staff is not None:
        user.is_staff = is_staff

    if is_superuser is not None:
        user.is_superuser = is_superuser

    if user.is_superuser:
        user.is_staff = True

    if is_staff is False:
        user.is_superuser = False

    user.save()

    return Response({
        "message": "Utilisateur modifié",
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def admin_delete_user(request, user_id):
    """Supprimer un utilisateur"""
    if not request.user.is_superuser:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    if request.user.id == int(user_id):
        return Response({"error": "Vous ne pouvez pas vous supprimer vous-même"}, status=400)
    
    try:
        user = User.objects.get(id=user_id)
        username = user.username
        user.delete()
        return Response({"message": f"Utilisateur {username} supprimé"})
    except User.DoesNotExist:
        return Response({"error": "Utilisateur non trouvé"}, status=404)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_get_stats(request):
    """Statistiques globales pour l'admin"""
    if not request.user.is_superuser:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    return Response({
        "total_users": User.objects.count(),
        "active_users": User.objects.filter(is_active=True).count(),
        "pending_users": User.objects.filter(is_active=False).count(),
        "total_sites": Website.objects.count(),
        "super_admins": User.objects.filter(is_superuser=True).count(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_ga_properties(request):
    """Lister les proprietes Google Analytics disponibles pour le super admin."""
    if not request.user.is_superuser:
        return Response({"error": "Acces refuse"}, status=403)

    try:
        from analytics_app.views import clear_google_token_for_user, safe_build_service

        service = safe_build_service("analyticsadmin", "v1beta", request.user)
        result = service.accountSummaries().list().execute()

        properties = []
        for account in result.get("accountSummaries", []):
            account_id = account.get("account", "").split("/")[-1]
            account_name = account.get("displayName")

            for prop in account.get("propertySummaries", []):
                properties.append({
                    "property_id": prop.get("property", "").split("/")[-1],
                    "display_name": prop.get("displayName"),
                    "account_id": account_id,
                    "account_name": account_name,
                })

        return Response(properties)

    except RefreshError:
        clear_google_token_for_user(request.user)
        return Response(
            {
                "error": "Connexion Google expiree.",
                "reconnect_required": True,
            },
            status=400,
        )
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_toggle_user_status(request, user_id):
    """Activer/désactiver un utilisateur"""
    if not request.user.is_superuser:
        return Response({"error": "Non autorisé"}, status=403)
    
    try:
        user = User.objects.get(id=user_id)
        user.is_active = not user.is_active
        user.save()
        
        # Envoyer un email d'activation si le compte est activé
        if user.is_active:
            try:
                send_mail(
                    subject="✅ Votre compte SEOmind a été activé",
                    message=f"""
Bonjour {user.username},

Votre compte sur la plateforme SEOmind a été activé par l'administrateur.

Connectez-vous ici : {settings.FRONTEND_URL}

Cordialement,
L'équipe SEOmind
                    """,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except:
                pass
        
        return Response({"message": "Statut modifié", "is_active": user.is_active})
    except User.DoesNotExist:
        return Response({"error": "Utilisateur non trouvé"}, status=404)
