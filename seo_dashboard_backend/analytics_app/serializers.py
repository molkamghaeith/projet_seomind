from rest_framework import serializers
from .models import Website, Analysis, Recommendation, SEORecommendation


class WebsiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Website
        fields = [
            "id",
            "url",
            "nom_site",
            "property_id",
            "property_name",
            "created_at",
            "updated_at",
        ]


class AnalysisSerializer(serializers.ModelSerializer):
    website_name = serializers.CharField(source="website.nom_site", read_only=True)
    website_url = serializers.CharField(source="website.url", read_only=True)

    class Meta:
        model = Analysis
        fields = "__all__"


class RecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recommendation
        fields = "__all__"


class SEORecommendationSerializer(serializers.ModelSerializer):
    website_name = serializers.CharField(source="website.nom_site", read_only=True)
    website_url = serializers.CharField(source="website.url", read_only=True)

    class Meta:
        model = SEORecommendation
        fields = "__all__"