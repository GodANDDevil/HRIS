from rest_framework import serializers

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

from .models import Employee, Department, Leave, Attendance
from .permission import get_employees, is_hr_department, is_hr_department_name

User = get_user_model()


def as_drf_error(exc):
    """Turn a Django model ValidationError into a DRF 400 instead of a 500."""
    if hasattr(exc, "message_dict"):
        return serializers.ValidationError(exc.message_dict)
    return serializers.ValidationError({"non_field_errors": exc.messages})


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
            and is_hr_department_name(department.name)
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

    @transaction.atomic
    def update(self, instance, validated_data):
        # "password" is not a model field; without this it was silently dropped.
        password = validated_data.pop("password", None)
        employee = super().update(instance, validated_data)

        user = employee.user
        if user:
            user.email = employee.email
            user.username = employee.email
            user.first_name = employee.first_name
            user.last_name = employee.last_name
            user.is_active = employee.is_active
            if password:
                user.set_password(password)
            user.save()

        return employee


class DepartmentMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ["id", "first_name", "last_name", "role"]


class DepartmentSerializer(serializers.ModelSerializer):
    # Light nested data: the department list is now readable by every logged-in
    # user (for dropdowns), so it must not expose emails/phones of everyone.
    employees = DepartmentMemberSerializer(many=True, read_only=True)
    department_head_name = serializers.SerializerMethodField()

    def get_department_head_name(self, obj):
        head = obj.department_head
        return f"{head.first_name} {head.last_name}".strip() if head else None

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Department name is required.")
        if Department.objects.filter(name__iexact=name).exclude(
            pk=self.instance.pk if self.instance else None
        ).exists():
            raise serializers.ValidationError("A department with this name already exists.")
        # Renaming the HR department to something else would lock every admin out.
        if self.instance and is_hr_department_name(self.instance.name) and not is_hr_department_name(name):
            raise serializers.ValidationError("The HR department's name must still contain 'HR'.")
        return name

    def validate_department_head(self, head):
        if head is not None and head.role != "HEAD":
            raise serializers.ValidationError("The department head must have the Department Head role.")
        return head

    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "description",
            "department_head",
            "department_head_name",
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
            "created_at",
        ]
        # employee is taken from the logged-in user in LeaveViewSet.perform_create,
        # so a staff member can no longer file leave on someone else's behalf.
        read_only_fields = [
            "employee",
            "department_id",
            "department_name",
            "designation",
            "total_days",
            "status",
            "created_at",
        ]

    def create(self, validated_data):
        employee = validated_data.get("employee")
        if employee is not None and employee.department_id is None:
            raise serializers.ValidationError({
                "employee": "Your profile has no department. Ask HR to assign one before applying for leave."
            })
        try:
            return super().create(validated_data)
        except DjangoValidationError as exc:
            raise as_drf_error(exc)

    def update(self, instance, validated_data):
        try:
            return super().update(instance, validated_data)
        except DjangoValidationError as exc:
            raise as_drf_error(exc)


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.__str__", read_only=True)
    # DRF raises an AssertionError when source= equals the field name, which
    # made every attendance response a 500. The source is implied.
    formatted_working_hours = serializers.CharField(read_only=True)

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
        # Attendance is only written through the check-in / check-out actions.
        read_only_fields = [
            "employee",
            "date",
            "check_in",
            "check_out",
            "working_hours",
            "formatted_working_hours",
            "status",
        ]


class MeSerializer(serializers.ModelSerializer):
    """The logged-in user's own employee profile plus what they may access."""

    department_name = serializers.CharField(source="department.name", read_only=True, default=None)
    is_hr = serializers.SerializerMethodField()

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
            "is_hr",
        ]

    def get_is_hr(self, obj):
        return is_hr_department(obj)