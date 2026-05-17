from django.urls import path
from .views import update_profile
from .views import (
    RegisterView,
    google_auth,
    forgot_password,
    reset_password_confirm,
    CustomTokenObtainPairView,

    get_user_role,
    admin_update_user,
    admin_get_users,
    admin_toggle_user_status,
    admin_delete_user,
    admin_get_stats,
    admin_create_user,
    admin_ga_properties,
)

urlpatterns = [
    path("profile/update/", update_profile),
    path("register/", RegisterView.as_view()),
    path("login/", CustomTokenObtainPairView.as_view()),
    path("google/", google_auth),

    path("forgot-password/", forgot_password),
    path("reset-password-confirm/", reset_password_confirm),

    path("me/", get_user_role),

    path("admin/users/", admin_get_users),
    path("admin/users/create/", admin_create_user),

    path("admin/users/<int:user_id>/update/", admin_update_user),

    path(
        "admin/users/<int:user_id>/toggle-status/",
        admin_toggle_user_status
    ),

    path(
        "admin/users/<int:user_id>/delete/",
        admin_delete_user
    ),

    path("admin/stats/", admin_get_stats),
    path("admin/ga-properties/", admin_ga_properties),
]
