from django.db import models
from django.contrib.auth.models import User

class GoogleAnalyticsToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True, null=True)
    token_uri = models.URLField(blank=True, null=True)
    client_id = models.TextField(blank=True, null=True)
    client_secret = models.TextField(blank=True, null=True)
    scopes = models.TextField(blank=True, null=True)
    expiry = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Google token - {self.user.username}"
class Site(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    url = models.URLField()
    nom_site = models.CharField(max_length=255)

    class Meta:
        unique_together = ('user', 'url')
class UserGAPropertyAccess(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    property_id = models.CharField(max_length=100)
    property_name = models.CharField(max_length=255)

    class Meta:
        unique_together = ("user", "property_id")

    def __str__(self):
        return f"{self.user.username} - {self.property_name}"