"""
URL configuration for HRIS project.
"""
from django.conf import settings
from django.conf.urls.static import static
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

# Serve uploaded leave documents during development.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
