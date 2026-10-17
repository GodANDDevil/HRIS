from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db import transaction

from rest_framework import status, viewsets, mixins
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import Employee, Department, Leave, Attendance
from .serializers import (
    EmployeeSerializer,
    DepartmentSerializer,
    LeaveSerializer,
    AttendanceSerializer,
    MeSerializer,
)
from .permission import (
    get_employees,
    is_hr_department,
    is_hr_department_name,
    IsAdminOrHR,
    IsHRDepartment,
    IsHRHead,
    AttendancePermission,
)


def api_health(request):
    return JsonResponse({'status': 'ok', 'service': 'hris-api'})


@ensure_csrf_cookie
def api_csrf(request):
    return JsonResponse({'detail': 'CSRF cookie set'})


def _error_payload(exc):
    return getattr(exc, "message_dict", None) or {"non_field_errors": exc.messages}


# Current user / "who am I"
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Returns the Employee profile linked to the logged-in user.
    The frontend uses this to know the employee id (for check-in/out)
    and whether to show the Admin/HR or the Employee workspace.
    """
    employee = get_employees(request.user)

    if employee is None:
        return Response(
            {"detail": "This login is not linked to an employee profile."},
            status=status.HTTP_404_NOT_FOUND,
        )
    if not employee.is_active:
        return Response(
            {"detail": "This employee account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response(MeSerializer(employee).data)


# Employee ViewSet / Employee API endpoints
class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("department").all().order_by("id")
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminOrHR]

    @transaction.atomic
    def perform_destroy(self, instance):
        # Deleting only the Employee left an orphan login behind.
        user = instance.user
        instance.delete()
        if user is not None:
            user.delete()


# Department ViewSet / Department API endpoints
class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related("department_head").order_by("name")
    serializer_class = DepartmentSerializer
    # Create / update / delete: HR Department Head only.
    permission_classes = [IsHRHead]

    def get_permissions(self):
        # Everyone logged in may read the department list (used in dropdowns).
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return super().get_permissions()

    def destroy(self, request, *args, **kwargs):
        department = self.get_object()

        # Employee.department uses on_delete=CASCADE, so deleting a department
        # would silently delete every employee (and their leave) in it.
        if department.employees.exists():
            return Response(
                {"error": "Move or remove this department's employees before deleting it."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # The HR department itself must never disappear, or nobody can log in as admin.
        if is_hr_department_name(department.name):
            return Response(
                {"error": "The HR department cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        department.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Leave ViewSet / Leave API endpoints
class LeaveViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    - Everyone: list/retrieve the leaves they are allowed to see, apply for
      their own leave, cancel (DELETE) their own PENDING leave.
    - HR: approve / reject through /leaves/<id>/review/.
    PUT/PATCH were removed: previously any user could edit any leave.
    """

    serializer_class = LeaveSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        employee = get_employees(self.request.user)
        qs = Leave.objects.select_related("employee", "department").order_by("-created_at")

        if not employee or not employee.is_active:
            return qs.none()

        # HR Head and HR Staff see every leave.
        if is_hr_department(employee):
            return qs

        # Other Department Heads see their department's leaves.
        if employee.role == "HEAD" and employee.department_id:
            return qs.filter(department_id=employee.department_id)

        # Staff see only their own.
        return qs.filter(employee=employee)

    def perform_create(self, serializer):
        employee = get_employees(self.request.user)
        if employee is None or not employee.is_active:
            raise PermissionDenied("Only active employees can apply for leave.")
        serializer.save(employee=employee)

    def destroy(self, request, *args, **kwargs):
        leave = self.get_object()
        employee = get_employees(request.user)

        if leave.employee_id != getattr(employee, "id", None):
            return Response(
                {"error": "You can only cancel your own leave requests."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if leave.status != "PENDING":
            return Response(
                {"error": "Only pending leave requests can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leave.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[IsHRDepartment])
    def review(self, request, pk=None):
        """HR reviews leave (approve/reject)"""
        leave = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ["APPROVED", "REJECTED"]:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        if leave.status != "PENDING":
            return Response(
                {"error": f"This request is already {leave.status.lower()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # HR members also apply for leave now; nobody may approve their own.
        reviewer = get_employees(request.user)
        if reviewer and leave.employee_id == reviewer.id:
            return Response(
                {"error": "You cannot review your own leave request. Another HR member must review it."},
                status=status.HTTP_403_FORBIDDEN,
            )

        leave.status = new_status
        try:
            leave.save()
        except ValidationError as exc:
            # Leave.save() runs full_clean(); without this a limit error was a 500.
            return Response({"error": _error_payload(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(LeaveSerializer(leave, context={"request": request}).data)


# Attendance ViewSet / Attendance API endpoints
class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only list/detail. Records are only created through the
    check-in / check-out actions, so nobody can fabricate attendance
    (previously any employee could POST a record for anyone).
    """

    serializer_class = AttendanceSerializer
    permission_classes = [AttendancePermission]

    def get_queryset(self):
        employee = get_employees(self.request.user)
        qs = Attendance.objects.select_related("employee")

        if not employee or not employee.is_active:
            return qs.none()

        # HR Head and HR Staff can view all attendance.
        if is_hr_department(employee):
            return qs.all()

        # Other Department Heads can view their department.
        if employee.role == "HEAD":
            return qs.filter(employee__department=employee.department)

        # Regular staff can view only their own attendance.
        return qs.filter(employee=employee)

    def check_employee_access(self, employee_id):
        current_employee = get_employees(self.request.user)

        try:
            requested_id = int(employee_id)
        except (TypeError, ValueError):
            return None

        if (
            not current_employee
            or not current_employee.is_active
            or current_employee.id != requested_id
        ):
            return None

        return current_employee

    @action(
        detail=False,
        methods=["post"],
        url_path="check-in/(?P<employee_id>[^/.]+)"
    )
    def check_in(self, request, employee_id=None):
        employee = self.check_employee_access(employee_id)

        if employee is None:
            return Response(
                {"error": "You can only check in for your own account."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()

        attendance, created = Attendance.objects.get_or_create(
            employee=employee,
            date=today,
        )

        if attendance.check_in:
            return Response(
                {"error": "Already checked in today."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attendance.check_in = timezone.now()

        try:
            attendance.save()
        except ValidationError as e:
            return Response(
                {"error": _error_payload(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            AttendanceSerializer(attendance).data,
            status=status.HTTP_201_CREATED if created
            else status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="check-out/(?P<employee_id>[^/.]+)"
    )
    def check_out(self, request, employee_id=None):
        employee = self.check_employee_access(employee_id)

        if employee is None:
            return Response(
                {"error": "You can only check out for your own account."},
                status=status.HTTP_403_FORBIDDEN,
            )

        attendance = get_object_or_404(
            Attendance,
            employee=employee,
            date=timezone.localdate(),
        )

        if not attendance.check_in:
            return Response(
                {"error": "You must check in before checking out."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if attendance.check_out:
            return Response(
                {"error": "Already checked out today."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attendance.check_out = timezone.now()

        try:
            attendance.save()
        except ValidationError as e:
            return Response(
                {"error": _error_payload(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(AttendanceSerializer(attendance).data)
