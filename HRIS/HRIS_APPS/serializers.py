from rest_framework import serializers

from django.contrib.auth import get_user_model
from django.db import transaction

from .models import Employee, Department, Leave, Attendance

User = get_user_model()

class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
    )
    class Meta:
        model = Employee
        fields = [
            "id",  
            "first_name",
            "last_name",
            "email",
            "role",
            "hire_date",
            "department",
            "department_name",
            "is_active",
            "password",
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    employees = EmployeeSerializer(many=True, read_only=True)

    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "description",
            "department_head",
            "employees",
        ]


class LeaveSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.__str__", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    designation = serializers.CharField(read_only=True)

    class Meta:
        model = Leave
        fields = [
            "id",
            "employee",
            "employee_name",
            "department_id",
            "department_name",
            "designation",
            "leave_type",
            "start_date",
            "end_date",
            "total_days",
            "reason",
            "document",
            "status",
        ]
        read_only_fields = ["department_id", "department_name", "designation", "total_days", "status"]


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.__str__", read_only=True)
    formatted_working_hours = serializers.CharField(source="formatted_working_hours", read_only=True)

    class Meta:
        model = Attendance
        fields = [
            "id",
            "employee",
            "employee_name",
            "date",
            "check_in",
            "check_out",
            "working_hours",
            "formatted_working_hours",
            "status",
        ]
        read_only_fields = ["working_hours", "formatted_working_hours", "status"]