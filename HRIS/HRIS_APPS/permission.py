from rest_framework.permissions import BasePermission
from .models import Employee

def get_employees(user):
    if not user or not user.is_authenticated:
        return None
    return(
        Employee.objects.filter(user=user).select_related('department').first()
    )
class IsAdminOrHR(BasePermission):
    """Allow only Admin (HR Head) or HR Staff to create accounts or departments."""
    def has_permission(self, request, view):
        user = request.user
        return (
            (user.role == "HEAD" and user.department.name == "HR") or
            (user.role == "STAFF" and user.department.name == "HR")
        )

class IsHRDepartment(BasePermission):
    """Allow only HR Department (Head + Staff)."""
    def has_permission(self, request, view):
        user = request.user
        return user.department and user.department.name == "HR"

class AttendancePermission(BasePermission):
    """HR sees all, Department Heads see their staff, Staff see themselves."""
    def has_permission(self, request, view):
        # Allow authenticated users to hit the endpoint
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.department and user.department.name == "HR":
            return True  # HR sees all
        if user.role == "HEAD" and obj.employee.department == user.department:
            return True  # Dept Head sees their dept
        return obj.employee == user  # Staff sees only themselves
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.department and user.department.name == "HR":
            return True  # HR sees all
        if user.role == "HEAD" and obj.employee.department == user.department:
            return True  # Dept Head sees their dept
        return obj.employee == user  # Staff sees only themselves
