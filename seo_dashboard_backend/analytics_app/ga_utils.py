# analytics_app/ga_utils.py
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
from datetime import date, timedelta
from django.conf import settings


GOOGLE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"

# IMPORTANT POUR CHARGER LES PROPRIÉTÉS GA4
GOOGLE_ANALYTICS_ADMIN_SCOPE = "https://www.googleapis.com/auth/analytics.edit"

GOOGLE_SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"

GOOGLE_SCOPES = [
    GOOGLE_ANALYTICS_SCOPE,
    GOOGLE_ANALYTICS_ADMIN_SCOPE,
    GOOGLE_SEARCH_CONSOLE_SCOPE,
]
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"


def _get_credentials(user):
    """Utilitaire : récupère les credentials Google pour un utilisateur."""
    from accounts.models import GoogleAnalyticsToken
    try:
        token_obj = GoogleAnalyticsToken.objects.get(user=user)
        credentials = Credentials(
            token=token_obj.access_token,
            refresh_token=token_obj.refresh_token,
            token_uri=GOOGLE_TOKEN_URI,
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=GOOGLE_SCOPES,
        )

        if credentials.expired and credentials.refresh_token:
            credentials.refresh(GoogleRequest())
            token_obj.access_token = credentials.token
            if credentials.refresh_token:
                token_obj.refresh_token = credentials.refresh_token
            token_obj.save()

        return credentials
    except Exception:
        return None


def _parse_dates(start_date, end_date, default_days=30):
    """Utilitaire : normalise les dates en string YYYY-MM-DD."""
    if not start_date:
        end_date = date.today()
        start_date = end_date - timedelta(days=default_days)
    if not end_date:
        end_date = date.today()

    start = start_date.strftime("%Y-%m-%d") if hasattr(start_date, 'strftime') else str(start_date)
    end = end_date.strftime("%Y-%m-%d") if hasattr(end_date, 'strftime') else str(end_date)
    return start, end


def fetch_top_pages(property_id, user, start_date=None, end_date=None, limit=10):
    """
    Récupère les pages les plus vues (titre, chemin, vues) pour une propriété GA.
    """
    credentials = _get_credentials(user)
    if not credentials:
        print("Avertissement: Token Google Analytics non trouvé")
        return []

    start, end = _parse_dates(start_date, end_date)
    print(f"Récupération des top pages - période: {start} -> {end}")

    service = build("analyticsdata", "v1beta", credentials=credentials)

    try:
        response = service.properties().runReport(
            property=f"properties/{property_id}",
            body={
                "dateRanges": [{"startDate": start, "endDate": end}],
                "dimensions": [
                    {"name": "pageTitle"},
                    {"name": "pagePath"}
                ],
                "metrics": [{"name": "screenPageViews"}],
                "orderBys": [
                    {"metric": {"metricName": "screenPageViews"}, "desc": True}
                ],
                "limit": limit
            }
        ).execute()

        pages = []
        for row in response.get("rows", []):
            pages.append({
                "title": row["dimensionValues"][0]["value"],
                "path": row["dimensionValues"][1]["value"],
                "views": int(row["metricValues"][0]["value"])
            })

        print(f"OK: {len(pages)} pages trouvées")
        return pages

    except Exception as e:
        print(f"Erreur fetch_top_pages: {e}")
        return []


def fetch_organic_traffic(property_id, user, start_date=None, end_date=None):
    """
    Récupère le nombre d'utilisateurs organiques (moteurs de recherche).
    """
    credentials = _get_credentials(user)
    if not credentials:
        print("Avertissement: Token Google Analytics non trouvé")
        return 0

    start, end = _parse_dates(start_date, end_date)

    service = build("analyticsdata", "v1beta", credentials=credentials)

    # Structure correcte pour l'API GA4 REST
    dimension_filter = {
        "filter": {
            "fieldName": "sessionDefaultChannelGroup",
            "stringFilter": {
                "matchType": "EXACT",
                "value": "Organic Search"
            }
        }
    }

    try:
        response = service.properties().runReport(
            property=f"properties/{property_id}",
            body={
                "dateRanges": [{"startDate": start, "endDate": end}],
                "dimensions": [{"name": "sessionDefaultChannelGroup"}],
                "metrics": [{"name": "activeUsers"}],
                "dimensionFilter": dimension_filter
            }
        ).execute()

        users = 0
        for row in response.get("rows", []):
            users += int(row["metricValues"][0]["value"])

        print(f"Trafic organique: {users} utilisateurs")
        return users

    except Exception as e:
        print(f"Erreur fetch_organic_traffic: {e}")
        return 0


def fetch_traffic_trend(property_id, user, days=30):
    """
    Récupère l'évolution du trafic sur les derniers jours.
    """
    credentials = _get_credentials(user)
    if not credentials:
        return []

    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    start = start_date.strftime("%Y-%m-%d")
    end = end_date.strftime("%Y-%m-%d")

    service = build("analyticsdata", "v1beta", credentials=credentials)

    try:
        response = service.properties().runReport(
            property=f"properties/{property_id}",
            body={
                "dateRanges": [{"startDate": start, "endDate": end}],
                "dimensions": [{"name": "date"}],
                "metrics": [{"name": "activeUsers"}]
            }
        ).execute()

        trend = []
        for row in response.get("rows", []):
            trend.append({
                "date": row["dimensionValues"][0]["value"],
                "users": int(row["metricValues"][0]["value"])
            })

        return trend

    except Exception as e:
        print(f"Erreur fetch_traffic_trend: {e}")
        return []
