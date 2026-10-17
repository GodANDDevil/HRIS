from rest_framework import serializers

from django.contrib.auth import get_user_model
from django.db import transaction

from .models import Employee, Department, Leave, Attendance
from .permission import get_employees, is_hr_department

User = get_user_model()


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )

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
            "phone",
            "role",
            "hire_date",
            "department",
            "department_name",
            "is_active",
            "password",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        role = attrs.get(
            "role",
            getattr(self.instance, "role", None),
        )
        department = attrs.get(
            "department",
            getattr(self.instance, "department", None),
        )

        request = self.context.get("request")
        creator = None

        if request and request.user.is_authenticated:
            creator = get_employees(request.user)

        # Only the HR Department Head (Admin) can create
        # an account with the HEAD role in the HR department.
        is_hr_head_account = (
            role == "HEAD"
            and department is not None
            and department.name.strip().casefold() == "hr"
        )

        if is_hr_head_account:
            if not (
                creator
                and creator.is_active
                and creator.role == "HEAD"
                and is_hr_department(creator)
            ):
                raise serializers.ValidationError({
                    "department": (
                        "Only the HR Department Head (Admin) "
                        "can create an HR Department Head account."
                    )
                })

        return attrs

    def validate_email(self, value):
        email = value.strip().lower()

        if Employee.objects.filter(email__iexact=email).exclude(
            pk=self.instance.pk if self.instance else None
        ).exists():
            raise serializers.ValidationError(
                "An employee with this email already exists."
            )

        return email

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password", None)

        if not password:
            raise serializers.ValidationError({
                "password": "A password is required to create an account."
            })

        email = validated_data["email"].strip().lower()

        if User.objects.filter(username__iexact=email).exists():
            raise serializers.ValidationError({
                "email": "A login account with this email already exists."
            })

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
        )

        employee = Employee.objects.create(
            user=user,
            **validated_data,
        )

        return employee


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