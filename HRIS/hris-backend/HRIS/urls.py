"""
URL configuration for HRIS project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('', include('HRIS_APPS.urls')),
]

