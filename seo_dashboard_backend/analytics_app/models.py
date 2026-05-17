from django.db import models
from django.contrib.auth.models import User


class Website(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="websites")
    url = models.URLField()
    nom_site = models.CharField(max_length=255)
    property_id = models.CharField(max_length=100, null=True, blank=True)
    property_name = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nom_site


class Analysis(models.Model):
    website = models.ForeignKey(Website, on_delete=models.CASCADE, related_name="analyses")

    # Données Google / SEO
    trafic = models.IntegerField(default=0)
    clics = models.IntegerField(default=0)
    impressions = models.IntegerField(default=0)
    ctr = models.FloatField(default=0.0)
    position = models.FloatField(default=0.0)

    # Données techniques
    total_pages = models.IntegerField(default=0)
    total_keywords = models.IntegerField(default=0)
    top_keyword = models.CharField(max_length=255, null=True, blank=True)

    # Scores détaillés
    score_technique = models.FloatField(default=0.0)
    score_contenu = models.FloatField(default=0.0)
    score_visibilite = models.FloatField(default=0.0)
    score_trafic = models.FloatField(default=0.0)
    score_global = models.FloatField(default=0.0)

    # Résumé textuel optionnel
    resume = models.TextField(blank=True, default="")

    date_analyse = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        ordering = ["-date_analyse"]
        verbose_name = "Analyse"
        verbose_name_plural = "Analyses"

    def __str__(self):
        return f"Analyse {self.website.nom_site} - {self.date_analyse:%Y-%m-%d %H:%M}"


# Ancien modèle conservé pour compatibilité
class Recommendation(models.Model):
    analysis = models.ForeignKey(Analysis, on_delete=models.CASCADE, related_name="legacy_recommendations")
    contenu = models.TextField()

    def __str__(self):
        return "Recommendation"


class SEORecommendation(models.Model):
    PRIORITY_CHOICES = [
        ("high", "Haute priorité"),
        ("medium", "Priorité moyenne"),
        ("low", "Priorité basse"),
    ]

    CATEGORY_CHOICES = [
        ("title", "Optimisation des titres"),
        ("meta", "Meta descriptions"),
        ("structure", "Structure HTML"),
        ("content", "Contenu"),
        ("technical", "Technique"),
        ("traffic", "Trafic"),
        ("engagement", "Engagement"),
        ("seo", "SEO"),
        ("opportunity", "Opportunité"),
    ]

    IMPACT_CHOICES = [
        ("high", "Impact élevé"),
        ("medium", "Impact moyen"),
        ("low", "Impact faible"),
    ]

    DIFFICULTY_CHOICES = [
        ("easy", "Facile"),
        ("medium", "Moyenne"),
        ("hard", "Difficile"),
    ]

    STATUS_CHOICES = [
        ("new", "Nouvelle"),
        ("in_progress", "En cours"),
        ("done", "Terminée"),
        ("ignored", "Ignorée"),
    ]

    website = models.ForeignKey(
        Website,
        on_delete=models.CASCADE,
        related_name="seo_recommendations"
    )

    # Optionnel : lier la recommandation à une analyse précise
    analysis = models.ForeignKey(
        Analysis,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="seo_recommendations"
    )

    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")

    # Nouveaux champs utiles pour un projet plus riche
    impact = models.CharField(max_length=20, choices=IMPACT_CHOICES, default="medium")
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")

    # Suggestion technique / correction proposée
    suggested_fix = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_read = models.BooleanField(default=False)
    is_applied = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Recommandation SEO"
        verbose_name_plural = "Recommandations SEO"

    def __str__(self):
        return f"[{self.get_priority_display()}] {self.title}"
class GitHubToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="github_token")
    access_token = models.TextField()
    github_username = models.CharField(max_length=255, blank=True, null=True)
    connected_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"GitHubToken({self.user.username})"