from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from django.core.mail import send_mail
from django.conf import settings
from .models import GoogleAnalyticsToken

# ================= GOOGLE ANALYTICS TOKEN =================
admin.site.register(GoogleAnalyticsToken)


# ================= GESTION DES UTILISATEURS =================
class CustomUserAdmin(UserAdmin):
    """
    Interface personnalisée pour gérer les utilisateurs dans l'admin Django
    """
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined')
    list_editable = ('is_active',)  # ← ajouter cette ligne

    list_filter = ('is_active', 'date_joined', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    # Actions personnalisées pour activer/désactiver en masse
    actions = ['activate_users', 'deactivate_users']
    
    def activate_users(self, request, queryset):
        """Activer les comptes sélectionnés et envoyer un email"""
        count = 0
        for user in queryset:
            if not user.is_active:
                user.is_active = True
                user.save()
                count += 1
                
                # ✅ Envoyer un email de bienvenue/activation
                self.send_activation_email(user)
        
        self.message_user(request, f"✅ {count} utilisateur(s) activé(s) avec succès. Un email a été envoyé.")
    activate_users.short_description = "✅ Activer les comptes sélectionnés"
    
    def deactivate_users(self, request, queryset):
        """Désactiver les comptes sélectionnés"""
        count = queryset.update(is_active=False)
        self.message_user(request, f"❌ {count} utilisateur(s) désactivé(s).")
    deactivate_users.short_description = "❌ Désactiver les comptes sélectionnés"
    
    def send_activation_email(self, user):
        """Envoyer un email à l'utilisateur pour l'informer que son compte est activé"""
        try:
            login_link = f"{settings.FRONTEND_URL}"
            
            subject = " Votre compte SEOmind a été activé"
            message = f"""
Bonjour {user.username},

Votre compte sur la plateforme SEOmind a été activé par l'administrateur.

Vous pouvez maintenant vous connecter à votre espace personnel :

 Lien de connexion : {login_link}

Identifiants :
- Nom d'utilisateur : {user.username}
- Mot de passe : celui que vous avez choisi lors de l'inscription

Cordialement,
L'équipe SEOmind
            """
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Erreur envoi email à {user.email}: {e}")
    
    def save_model(self, request, obj, form, change):
        """Quand on sauvegarde un utilisateur depuis l'admin"""
        # Vérifier si le compte vient d'être activé
        if change:  # Modification d'un utilisateur existant
            original = User.objects.get(pk=obj.pk)
            if not original.is_active and obj.is_active:
                # Le compte vient d'être activé !
                self.send_activation_email(obj)
        
        super().save_model(request, obj, form, change)
    
    # Personnaliser l'affichage du formulaire d'édition
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Informations personnelles', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates importantes', {'fields': ('last_login', 'date_joined')}),
    )


# Remplacer l'administration par défaut des utilisateurs
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)