
from rest_framework.permissions import BasePermission

from .models import Employee


def get_employees(user):
    """Return the Employee profile linked to a Django user."""
    if not user or not user.is_authenticated:
        return None

    return (
        Employee.objects
        .select_related("department")
        .filter(user=user)
        .first()
    )


def is_hr_department(employee):
    """Check whether an employee belongs to HR."""
    return bool(
        employee
        and employee.department
        and employee.department.name.strip().casefold() == "hr"
    )


class IsAdminOrHR(BasePermission):
    """
    Allow HR Department Head (Admin) and HR Department Staff
    to access department and account management endpoints.
    """

    def has_permission(self, request, view):
        employee = get_employees(request.user)

        if not employee or not employee.is_active:
            return False

        return (
            is_hr_department(employee)
            and employee.role in ("HEAD", "STAFF")
        )


class IsHRDepartment(BasePermission):
    """
    Allow active HR Department Heads and HR Department Staff.
    Use this for endpoints intended for both HR roles.
    """

    def has_permission(self, request, view):
        employee = get_employees(request.user)

        return bool(
            employee
            and employee.is_active
            and is_hr_department(employee)
            and employee.role in ("HEAD", "STAFF")
        )


class AttendancePermission(BasePermission):
    """
    HR Head and HR Staff: access all attendance records.
    Other Department Heads: access their department's records.
    Other Staff: access their own records.
    """

    def has_permission(self, request, view):
        employee = get_employees(request.user)

        return bool(employee and employee.is_active)

    def has_object_permission(self, request, view, obj):
        employee = get_employees(request.user)

        if not employee or not employee.is_active:
            return False

        # Attendance.employee is an Employee object.
        record_employee = getattr(obj, "employee", None)

        if record_employee is None:
            return False

        # HR Head and HR Staff can access all attendance records.
        if is_hr_department(employee):
            return employee.role in ("HEAD", "STAFF")

        # A department head can access records from their department.
        if employee.role == "HEAD":
            return (
                employee.department_id is not None
                and record_employee.department_id
                == employee.department_id
            )

        # Regular staff can access only their own attendance.
        return record_employee.pk == employee.pk
