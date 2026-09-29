from django.db import models

#Roles of the employees
ROLE_CHOICES = (
    ('STAFF', 'Staff'),
    ('HEAD', 'Department Head'),
)

# Create your models here.

#Employee model to store employee information
class Employee(models.Model):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STAFF')
    hire_date = models.DateField()
    department = models.ForeignKey("Department", on_delete=models.CASCADE, related_name="members", null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role})"

# Department model to store department information
class Department(models.Model):
    name = models.CharField(max_length=100)
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

#Leave model to store leave information
class Leave(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leaves")
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=LEAVE_STATUS_CHOICES, default='PENDING')

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
    date = models.DateField(auto_now_add=True)
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    working_hours = models.DurationField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=ATTENDANCE_STATUS_CHOICES, default='ABSENT')

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

        super().save(*args, **kwargs)

    def formatted_working_hours(self):
        if self.working_hours:
            total_seconds = int(self.working_hours.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, _ = divmod(remainder, 60)
            return f"{hours}h {minutes}m"
        return "–"

    def __str__(self):
        return f"{self.employee} - {self.date} ({self.status})"
    