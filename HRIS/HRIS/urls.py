"""
URL configuration for HRIS project.
"""
from django.contrib import admin
from django.urls import path, include

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from HRIS_APPS.auth_serializers import EmailOrUsernameTokenSerializer


class EmailOrUsernameTokenView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenSerializer


urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/', include('HRIS_APPS.urls')),
    path(
        'api/auth/token/',
        EmailOrUsernameTokenView.as_view(),
        name='token_obtain_pair',
    ),
    path(
        'api/auth/token/refresh/',
        TokenRefreshView.as_view(),
        name='token_refresh',
    ),
]

