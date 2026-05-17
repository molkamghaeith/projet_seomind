from django.urls import path

from .views import (
    EmailTokenObtainPairView,
    WebsiteCreateView,
    WebsiteListView,
    WebsiteDeleteView,
    google_analytics_login,
    google_analytics_status,
    google_analytics_callback,
    list_ga_properties,
    get_ga_data,
    verify_ga_property_url,
    get_search_console_data,
    get_seo_recommendations_api,
    export_seo_csv,
    export_analytics_csv,
    export_full_pdf,
    analyze_site_seo,
    auto_fix_recommendation,
    semantic_analysis,
    get_top_pages,
    get_organic_traffic,
    get_traffic_trend,
    get_seo_score,
    get_analysis_history,
    get_seo_opportunities,
    forgot_password,
)

from .views_github import (
    github_login,
    github_callback,
    github_repos,
    github_branches,
    github_candidate_files,
    github_get_file,
    github_preview_fix,
    github_create_branch_and_pr,
    github_disconnect,
)

urlpatterns = [
    path("auth/login/", EmailTokenObtainPairView.as_view(), name="login"),
    path("auth/forgot-password/", forgot_password, name="forgot_password"),

    path("add-site/", WebsiteCreateView.as_view(), name="add_site"),
    path("sites/", WebsiteListView.as_view(), name="sites"),
    path("delete-site/<int:pk>/", WebsiteDeleteView.as_view(), name="delete_site"),

    path("google-analytics/login/", google_analytics_login, name="google_analytics_login"),
    path("google-analytics/status/", google_analytics_status, name="google_analytics_status"),
    path("google-analytics/callback/", google_analytics_callback, name="google_analytics_callback"),
    path("google-analytics/properties/", list_ga_properties, name="google_analytics_properties"),
    path("google-analytics/data/<str:property_id>/", get_ga_data, name="google_analytics_data"),
    path("google-analytics/verify-url/", verify_ga_property_url, name="verify_ga_property_url"),

    path("search-console/data/", get_search_console_data, name="search_console_data"),

    path("recommendations/<int:website_id>/", get_seo_recommendations_api, name="recommendations"),
    path("seo-score/<int:website_id>/", get_seo_score, name="seo_score"),
    path("analysis-history/<int:website_id>/", get_analysis_history, name="analysis_history"),
    path("seo-opportunities/<int:website_id>/", get_seo_opportunities, name="seo_opportunities"),

    path("export/seo-csv/<int:website_id>/", export_seo_csv, name="export_seo_csv"),
    path("export/analytics-csv/<int:website_id>/", export_analytics_csv, name="export_analytics_csv"),
    path("export/full-pdf/<int:website_id>/", export_full_pdf, name="export_full_pdf"),

    path("analyze-seo/<int:website_id>/", analyze_site_seo, name="analyze_seo"),
    path("semantic-analysis/<int:website_id>/", semantic_analysis, name="semantic_analysis"),
    path("auto-fix/<int:website_id>/", auto_fix_recommendation, name="auto_fix"),

    path("top-pages/<str:property_id>/", get_top_pages, name="top_pages"),
    path("organic-traffic/<str:property_id>/", get_organic_traffic, name="organic_traffic"),
    path("traffic-trend/<str:property_id>/", get_traffic_trend, name="traffic_trend"),

    path("github/login/", github_login, name="github_login"),
    path("github/callback/", github_callback, name="github_callback"),
    path("github/repos/", github_repos, name="github_repos"),
    path("github/branches/<str:owner>/<str:repo>/", github_branches, name="github_branches"),
    path("github/candidate-files/<str:owner>/<str:repo>/", github_candidate_files, name="github_candidate_files"),
    path("github/file/", github_get_file, name="github_get_file"),
    path("github/preview-fix/", github_preview_fix, name="github_preview_fix"),
    path("github/create-branch-pr/", github_create_branch_and_pr, name="github_create_branch_pr"),
    path("github/disconnect/", github_disconnect, name="github_disconnect"),
]
