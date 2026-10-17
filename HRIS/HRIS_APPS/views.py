from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.exceptions import ValidationError

from rest_framework import status,viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .permission import get_employees, is_hr_department

from .models import Employee, Department, Leave, Attendance
from .serializers import (
    EmployeeSerializer, 
    DepartmentSerializer, 
    LeaveSerializer, 
    AttendanceSerializer
    )
from .permission import (
    IsAdminOrHR, 
    IsHRDepartment, 
    AttendancePermission
    )

def api_health(request):
    return JsonResponse({'status': 'ok', 'service': 'hris-api'})


@ensure_csrf_cookie
def api_csrf(request):
    return JsonResponse({'detail': 'CSRF cookie set'})

#Employee ViewSet / Employee API endpoints
class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminOrHR]

#Department ViewSet / Department API endpoints
class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsHRDepartment]

#Leave ViewSet / Leave API endpoints
class LeaveViewSet(viewsets.ModelViewSet):
    queryset = Leave.objects.all()
    serializer_class = LeaveSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=["post"], permission_classes=[IsHRDepartment])
    def review(self, request, pk=None):
        """HR reviews leave (approve/reject)"""
        leave = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ["APPROVED", "REJECTED"]:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        leave.status = new_status
        leave.save()
        serializer = LeaveSerializer(leave)
        return Response(serializer.data)

#Attendance ViewSet / Attendance API endpoints
class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [AttendancePermission]

    def get_queryset(self):
        employee = get_employees(self.request.user)

        if not employee or not employee.is_active:
            return Attendance.objects.none()

        # HR Head and HR Staff can view all attendance.
        if is_hr_department(employee):
            return Attendance.objects.all()

        # Other Department Heads can view their department.
        if employee.role == "HEAD":
            return Attendance.objects.filter(
                employee__department=employee.department
            )

        # Regular staff can view only their own attendance.
        return Attendance.objects.filter(employee=employee)

    def check_employee_access(self, employee_id):
        current_employee = get_employees(self.request.user)

        if (
            not current_employee
            or not current_employee.is_active
            or current_employee.id != int(employee_id)
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
            attendance.full_clean()
            attendance.save()
        except ValidationError as e:
            return Response(
                {"error": getattr(e, "message_dict", e.messages)},
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
            attendance.full_clean()
            attendance.save()
        except ValidationError as e:
            return Response(
                {"error": getattr(e, "message_dict", e.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(AttendanceSerializer(attendance).data)
    