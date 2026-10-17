from django.db import models
from datetime import timedelta, time
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone

#Roles of the employees
ROLE_CHOICES = (
    ('STAFF', 'Staff'),
    ('HEAD', 'Department Head'),
)

# Create your models here.

#Employee model to store employee information
class Employee(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        null = True,
        blank = True,
        related_name="employee_profile")

    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    role = models.CharField(max_length=20, 
                            choices=ROLE_CHOICES, 
                            default='STAFF')
    hire_date = models.DateField()
    department = models.ForeignKey("Department", 
                                   on_delete=models.CASCADE, 
                                   related_name="employees", 
                                   null=True,
                                   blank=True)
    
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role})"

# Department model to store department information
class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    # One department head (must be an Employee with role HEAD)
    department_head = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="headed_departments",
        limit_choices_to={'role': 'HEAD'}
    )

    # Employees will be linked via Employee.department FK
    # So you don’t need a separate IntegerField for members count

    def __str__(self):
        return self.name

# Leave status choices
LEAVE_STATUS_CHOICES = (
    ('PENDING', 'Pending'),
    ('APPROVED', 'Approved'),
    ('REJECTED', 'Rejected'),
)

# Leave type choices
LEAVE_TYPE_CHOICES = (
    ('ANNUAL', 'Annual Leave'),
    ('SICK', 'Sick Leave'),
    ('CASUAL', 'Casual Leave'),
    ('FESTIVE', 'Festive Leave'),
    ('STUDY', 'Study Leave'),
    ('HALF_DAY', 'Half Day'),
    ('UNPAID', 'Unpaid Leave'),
    ('EMERGENCY', 'Emergency Leave'),
    ('OTHERS', 'Others'),
)

#Leave limits(6 months)
LEAVE_LIMITS = {
    'ANNUAL': 10,
    'SICK': 15,
    'CASUAL': 6,
    'FESTIVE': 6,
    # STUDY, HALF_DAY, UNPAID, EMERGENCY, OTHERS → unlimited
}
#Leave model to store leave information
class Leave(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leaves")
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="leaves", editable=False)
    designation = models.CharField(max_length=20, choices=ROLE_CHOICES, editable=False)  # Staff or Head
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPE_CHOICES, default='CASUAL')
    start_date = models.DateField()
    end_date = models.DateField()
    total_days = models.IntegerField(blank=True, null=True)
    reason = models.TextField(blank=True, null=True)
    document = models.FileField(upload_to="leave_documents/", blank=True, null=True)  # optional
    status = models.CharField(max_length=20, choices=LEAVE_STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    def clean(self):
        if self.start_date and self.end_date:
            if self.end_date < self.start_date:
                raise ValidationError({
                    "end_date": "End date cannot be before start date."
                })

        if (
            self.leave_type in LEAVE_LIMITS
            and self.employee_id
            and self.start_date
        ):
            six_months_ago = self.start_date - timedelta(days=180)

            used_days = (
                Leave.objects.filter(
                    employee=self.employee,
                    leave_type=self.leave_type,
                    status__in=["APPROVED", "PENDING"],
                    start_date__gte=six_months_ago,
                    start_date__lte=self.start_date,
                )
                .exclude(pk=self.pk)
                .aggregate(models.Sum("total_days"))["total_days__sum"]
                or 0
            )

            if (
                self.total_days
                and used_days + self.total_days
                > LEAVE_LIMITS[self.leave_type]
            ):
                raise ValidationError(
                    f"{self.leave_type} limit exceeded. "
                    f"Allowed: {LEAVE_LIMITS[self.leave_type]} days in 6 months."
                )

    def save(self, *args, **kwargs):
        if self.start_date and self.end_date:
            self.total_days = (
                self.end_date - self.start_date
            ).days + 1

        if self.employee_id:
            self.department = self.employee.department
            self.designation = self.employee.role

        self.full_clean()

        super().save(*args, **kwargs)
    def __str__(self):
        return f"{self.employee} - {self.status} ({self.start_date} to {self.end_date})"

# Attendance status choices
ATTENDANCE_STATUS_CHOICES = (
    ('PRESENT', 'Present'),
    ('ABSENT', 'Absent'),
    ('LATE', 'Late'),
    ('EARLY_DEPARTURE', 'Early Departure'),
    ('CHECKED_IN', 'Checked In'),
    ('ON_LEAVE', 'On Leave'),
)

#Attendance model to store attendance information
class Attendance(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance_records")
    # auto_now_add made the field non-editable and left self.date = None inside
    # save() for new rows, which crashed the approved-leave lookup below.
    date = models.DateField(default=timezone.localdate)  # one record per day
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    working_hours = models.DurationField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=ATTENDANCE_STATUS_CHOICES, default='ABSENT')

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "date"],
                name="unique_employee_attendance_per_day",
            )
        ]

        ordering = [
            "-date",
            "-check_in",
        ]

    def clean(self):
        if (
            self.check_in
            and self.check_out
            and self.check_out < self.check_in
        ):
            raise ValidationError({
                "check_out": "Check-out cannot be before check-in."
            })


    def save(self, *args, **kwargs):
        # Auto-calculate working hours
        if self.check_in and self.check_out:
            self.working_hours = self.check_out - self.check_in

        # If employee has approved leave for this date, mark as ON_LEAVE
        approved_leave = self.employee.leaves.filter(
            status="APPROVED",
            start_date__lte=self.date,
            end_date__gte=self.date
        ).exists()
        if approved_leave:
            self.status = "ON_LEAVE"

        # check_in is stored in UTC; compare against local (Asia/Kathmandu) time.
        elif self.check_in and timezone.localtime(self.check_in).time() >= time(11, 0):
            self.status = "LATE"

        elif self.check_in and not self.check_out:
            self.status = "CHECKED_IN"

        elif self.check_in and self.check_out:

            if self.working_hours.total_seconds() < 8 * 3600:
                self.status = "EARLY_DEPARTURE"
            else:
                self.status = "PRESENT"

        else:
            self.status = "ABSENT"

        self.full_clean()

        super().save(*args, **kwargs)

    def formatted_working_hours(self):
        if not self.working_hours:
            return "–"
        total_seconds = int(
            self.working_hours.total_seconds()
        )
        hours, remainder = divmod(
            total_seconds,
            3600,
        )
        minutes, _ = divmod(
            remainder,
            60,
        )
        return f"{hours}h {minutes}m"

    def __str__(self):
        return (
            f"{self.employee} - "
            f"{self.date} ({self.status})"
        )