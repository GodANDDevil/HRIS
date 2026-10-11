from django.urls import path, include
from . import views

from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, DepartmentViewSet, LeaveViewSet, AttendanceViewSet

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'leaves', LeaveViewSet, basename='leave')
router.register(r'attendance', AttendanceViewSet, basename='attendance')

urlpatterns = [
    path('health/', views.api_health, name='api_health'),
    path('csrf/', views.api_csrf, name='api_csrf'),
    path('', include(router.urls)),
]
