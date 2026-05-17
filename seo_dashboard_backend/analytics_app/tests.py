from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate

from .models import GitHubToken
from .views_github import github_disconnect


@override_settings(
    GITHUB_CLIENT_ID="test-client-id",
    GITHUB_CLIENT_SECRET="test-client-secret",
)
class GitHubDisconnectTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="password",
        )

    def call_disconnect(self):
        request = self.factory.post("/api/github/disconnect/")
        force_authenticate(request, user=self.user)
        return github_disconnect(request)

    @patch("analytics_app.views_github.requests.delete")
    def test_disconnect_revokes_and_deletes_github_token(self, mock_delete):
        mock_delete.return_value = Mock(status_code=204)
        GitHubToken.objects.create(
            user=self.user,
            access_token="github-token",
            github_username="octocat",
        )

        response = self.call_disconnect()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertTrue(response.data["github_disconnected"])
        self.assertTrue(response.data["revoked"])
        self.assertFalse(GitHubToken.objects.filter(user=self.user).exists())
        mock_delete.assert_called_once()

    @patch("analytics_app.views_github.requests.delete")
    def test_disconnect_is_successful_without_existing_github_token(self, mock_delete):
        response = self.call_disconnect()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertTrue(response.data["github_disconnected"])
        mock_delete.assert_not_called()
