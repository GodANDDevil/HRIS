"""
Shared test data and helpers used by every test file.

Nothing in here is a test by itself. Every test class inherits from
HRISTestCase, which builds the same small company once per class:

    Department "HR"     -> hr_head (HEAD, the Admin)   hr_staff (STAFF)
    Department "IT"     -> it_head (HEAD)              it_staff, it_staff2 (STAFF)
    Department "Sales"  -> sales_staff (STAFF)
    No department       -> no_dept_staff (STAFF)
    A login with NO employee profile -> plain_user

That mix lets every permission rule be tested from every angle:
HR head vs HR staff vs another department's head vs ordinary staff.
"""
from datetime import datetime, timedelta
from unittest import mock
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from HRIS_APPS.models import Attendance, Department, Employee, Leave

User = get_user_model()

# The project runs on Nepal time (settings.TIME_ZONE = "Asia/Kathmandu").
KTM = ZoneInfo("Asia/Kathmandu")

# Every user in the suite gets the same password so login tests are simple.
PASSWORD = "Str0ng-Passw0rd!"


def kathmandu(year, month, day, hour=0, minute=0):
    """A timezone-aware datetime in Nepal local time, e.g. kathmandu(2026, 10, 20, 9, 0)."""
    return datetime(year, month, day, hour, minute, tzinfo=KTM)


def freeze_time(moment):
    """
    Pretend "now" is `moment` (an aware datetime).

    Check-in / check-out stamp the current time and the LATE rule depends on
    the clock (>= 11:00 local), so without freezing the clock the result would
    change depending on when you run the tests.

    Patching django.utils.timezone.now also changes timezone.localdate(),
    which views.py and the Attendance.date default both use for "today".

    Usage:
        with freeze_time(kathmandu(2026, 10, 20, 9, 0)):
            ...
    """
    return mock.patch("django.utils.timezone.now", return_value=moment)


def make_employee(email, first="Test", last="User", role="STAFF",
                  department=None, is_active=True, with_login=True):
    """
    Create an Employee (and, by default, the Django login User linked to it),
    the same way EmployeeSerializer.create does: username == email.
    """
    user = None
    if with_login:
        user = User.objects.create_user(
            username=email, email=email, password=PASSWORD,
            first_name=first, last_name=last,
        )
    return Employee.objects.create(
        user=user,
        first_name=first,
        last_name=last,
        email=email,
        role=role,
        hire_date="2024-01-15",
        department=department,
        is_active=is_active,
    )


def make_leave(employee, start, days=1, leave_type="CASUAL", status="PENDING", reason="Test"):
    """
    Create a Leave through the model (so Leave.save() fills total_days,
    department and designation and runs the limit check), starting on
    `start` (a date) and lasting `days` calendar days.
    """
    return Leave.objects.create(
        employee=employee,
        leave_type=leave_type,
        start_date=start,
        end_date=start + timedelta(days=days - 1),
        reason=reason,
        status=status,
    )


def make_attendance(employee, day, check_in=None, check_out=None):
    """Create an Attendance row for `employee` on `day` (a date)."""
    return Attendance.objects.create(
        employee=employee, date=day, check_in=check_in, check_out=check_out,
    )


def user_of(who):
    """Accept an Employee or a User (or AnonymousUser) and return the login user."""
    return who.user if isinstance(who, Employee) else who


class HRISTestCase(APITestCase):
    """
    Base class for every test. `setUpTestData` runs once per class (fast);
    Django gives each individual test a fresh copy, and every test runs in a
    transaction that is rolled back afterwards, so tests never affect each other.
    """

    @classmethod
    def setUpTestData(cls):
        cls.hr = Department.objects.create(name="HR", description="Human resources")
        cls.it = Department.objects.create(name="IT", description="Engineering")
        cls.sales = Department.objects.create(name="Sales")

        cls.hr_head = make_employee("hr.head@nda.test", "Hari", "Head", "HEAD", cls.hr)
        cls.hr_staff = make_employee("hr.staff@nda.test", "Sita", "Staff", "STAFF", cls.hr)
        cls.it_head = make_employee("it.head@nda.test", "Ram", "Lead", "HEAD", cls.it)
        cls.it_staff = make_employee("it.staff@nda.test", "Gita", "Dev", "STAFF", cls.it)
        cls.it_staff2 = make_employee("it.staff2@nda.test", "Bikash", "Dev", "STAFF", cls.it)
        cls.sales_staff = make_employee("sales@nda.test", "Mina", "Seller", "STAFF", cls.sales)
        cls.no_dept_staff = make_employee("nodept@nda.test", "Nobody", "Nowhere", "STAFF", None)

        cls.hr.department_head = cls.hr_head
        cls.hr.save()
        cls.it.department_head = cls.it_head
        cls.it.save()

        # A login that exists but has no Employee row behind it
        # (e.g. a bare `createsuperuser`).
        cls.plain_user = User.objects.create_user(
            username="plain", email="plain@nda.test", password=PASSWORD,
        )

    # ---- small helpers used inside tests -------------------------------

    def login_as(self, who):
        """
        Authenticate the test client as an Employee (or a bare User).
        force_authenticate skips JWT, so each test focuses on its own rule;
        the real JWT login is tested in test_auth_and_urls.py.
        """
        self.client.force_authenticate(user=user_of(who))

    def logout(self):
        self.client.force_authenticate(user=None)

    @staticmethod
    def ids(response):
        """The set of `id` values in a list response."""
        return {row["id"] for row in response.json()}
