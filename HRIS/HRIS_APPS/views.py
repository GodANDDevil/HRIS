from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.exceptions import ValidationError

from rest_framework import status,viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

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
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [AttendancePermission]

    @action(detail=False, methods=["post"], url_path="check-in/(?P<employee_id>[^/.]+)")
    def check_in(self, request, employee_id=None):
        """Employee clicks Check-In"""
        employee = get_object_or_404(Employee, id=employee_id)
        today = timezone.now().date()

        attendance, created = Attendance.objects.get_or_create(employee=employee, date=today)
        if attendance.check_in:
            return Response({"error": "Already checked in today"}, status=status.HTTP_400_BAD_REQUEST)

        attendance.check_in = timezone.now()
        try:
            attendance.full_clean()
            attendance.save()
        except ValidationError as e:
            return Response({"error": e.message_dict}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AttendanceSerializer(attendance)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="check-out/(?P<employee_id>[^/.]+)")
    def check_out(self, request, employee_id=None):
        """Employee clicks Check-Out"""
        employee = get_object_or_404(Employee, id=employee_id)
        today = timezone.now().date()

        attendance = get_object_or_404(Attendance, employee=employee, date=today)
        if attendance.check_out:
            return Response({"error": "Already checked out today"}, status=status.HTTP_400_BAD_REQUEST)

        attendance.check_out = timezone.now()
        try:
            attendance.full_clean()
            attendance.save()
        except ValidationError as e:
            return Response({"error": e.message_dict}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AttendanceSerializer(attendance)
        return Response(serializer.data)