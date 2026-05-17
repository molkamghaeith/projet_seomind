from django.contrib import admin
from .models import Website, Analysis, Recommendation, SEORecommendation


# ================= WEBSITE =================
@admin.register(Website)
class WebsiteAdmin(admin.ModelAdmin):
    list_display = ("nom_site", "url", "property_id", "user", "created_at")
    search_fields = ("nom_site", "url")
    list_filter = ("created_at",)
    ordering = ("-created_at",)


# ================= ANALYSIS =================
@admin.register(Analysis)
class AnalysisAdmin(admin.ModelAdmin):
    list_display = (
        "website",
        "trafic",
        "clics",
        "impressions",
        "ctr",
        "position",
        "score_global",
        "date_analyse",
    )
    list_filter = ("date_analyse",)
    search_fields = ("website__nom_site",)
    ordering = ("-date_analyse",)


# ================= OLD RECOMMENDATION =================
@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ("analysis", "contenu")
    search_fields = ("contenu",)


# ================= SEO RECOMMENDATION =================
@admin.register(SEORecommendation)
class SEORecommendationAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "website",
        "category",
        "priority",
        "impact",
        "difficulty",
        "status",
        "is_applied",
        "created_at",
    )

    list_filter = (
        "priority",
        "category",
        "impact",
        "difficulty",
        "status",
        "is_applied",
        "created_at",
    )

    search_fields = ("title", "description", "website__nom_site")

    ordering = ("-created_at",)

    list_editable = ("status", "is_applied")  # 🔥 tu peux modifier direct depuis admin