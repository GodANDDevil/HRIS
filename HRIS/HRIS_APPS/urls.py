from django.urls import path
from . import views

urlpatterns = [
    path('api/health/', views.api_health, name='api_health'),
    path('api/csrf/', views.api_csrf, name='api_csrf'),
]
