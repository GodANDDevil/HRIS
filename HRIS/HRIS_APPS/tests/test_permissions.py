"""
Tests for HRIS_APPS/permission.py

Covers:
    get_employees(user)                  -> which Employee belongs to a login
    is_hr_department_name(name)          -> does a department name mean "HR"?
    is_hr_department(employee)           -> is this employee in HR?
    IsAdminOrHR.has_permission           -> HR head + HR staff (employee management)
    IsHRDepartment.has_permission        -> HR head + HR staff (leave review)
    IsHRHead.has_permission              -> HR head only (department management)
    AttendancePermission.has_permission  -> any active employee
    AttendancePermission.has_object_permission -> who may see which attendance row

The permission classes are called directly with a tiny fake request object,
so these tests check the rule itself without going through any URL.
"""
from datetime import date
from types import SimpleNamespace

from django.contrib.auth.models import AnonymousUser

from HRIS_APPS.models import Department
from HRIS_APPS.permission import (
    AttendancePermission,
    IsAdminOrHR,
    IsHRDepartment,
    IsHRHead,
    get_employees,
    is_hr_department,
    is_hr_department_name,
)

from .base import HRISTestCase, make_attendance, make_employee, user_of


def fake_request(user):
    """Permission classes only read request.user, so that's all we provide."""
    return SimpleNamespace(user=user)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
class GetEmployeesTests(HRISTestCase):

    def test_returns_linked_employee(self):
        self.assertEqual(get_employees(self.it_staff.user), self.it_staff)

    def test_none_for_user_without_employee_profile(self):
        self.assertIsNone(get_employees(self.plain_user))

    def test_none_for_anonymous_user(self):
        self.assertIsNone(get_employees(AnonymousUser()))

    def test_none_for_no_user(self):
        self.assertIsNone(get_employees(None))

    def test_returns_inactive_employee_too(self):
        # get_employees does NOT filter on is_active; each caller checks it.
        emp = make_employee("inactive@nda.test", department=self.it, is_active=False)
        self.assertEqual(get_employees(emp.user), emp)


class IsHrDepartmentNameTests(HRISTestCase):

    def test_names_that_mean_hr(self):
        for name in [
            "HR", "hr", "Hr Team", "HR & Admin", "People Engagement & HR",
            "Human Resources", "human resource", "HUMAN   RESOURCES",
        ]:
            with self.subTest(name=name):
                self.assertTrue(is_hr_department_name(name))

    def test_names_that_do_not_mean_hr(self):
        # "hr" must be a whole word: "Chrome" or "Threshold" are not HR.
        for name in ["IT", "Sales", "Chrome Team", "Threshold", "Humans", "Shrink", "", None]:
            with self.subTest(name=name):
                self.assertFalse(is_hr_department_name(name))


class IsHrDepartmentTests(HRISTestCase):

    def test_true_for_hr_head_and_hr_staff(self):
        self.assertTrue(is_hr_department(self.hr_head))
        self.assertTrue(is_hr_department(self.hr_staff))

    def test_false_for_other_departments(self):
        self.assertFalse(is_hr_department(self.it_head))
        self.assertFalse(is_hr_department(self.sales_staff))

    def test_false_without_department_or_employee(self):
        self.assertFalse(is_hr_department(self.no_dept_staff))
        self.assertFalse(is_hr_department(None))

    def test_any_hr_like_department_name_counts(self):
        people = Department.objects.create(name="People Engagement & HR")
        emp = make_employee("pe@nda.test", department=people)
        self.assertTrue(is_hr_department(emp))


# ---------------------------------------------------------------------------
# Permission classes: has_permission
# ---------------------------------------------------------------------------
class HRPermissionClassTests(HRISTestCase):
    """
    One table per class: who should be allowed (True) or refused (False).
    """

    def check(self, permission_class, expected):
        perm = permission_class()
        for label, who, allowed in expected:
            with self.subTest(permission=permission_class.__name__, who=label):
                self.assertEqual(perm.has_permission(fake_request(user_of(who)), view=None), allowed)

    def make_inactive_hr_head(self):
        return make_employee("old.hr@nda.test", role="HEAD", department=self.hr, is_active=False)

    def test_is_admin_or_hr(self):
        self.check(IsAdminOrHR, [
            ("HR head", self.hr_head, True),
            ("HR staff", self.hr_staff, True),
            ("IT head", self.it_head, False),
            ("IT staff", self.it_staff, False),
            ("no department", self.no_dept_staff, False),
            ("login without employee", self.plain_user, False),
            ("anonymous", AnonymousUser(), False),
            ("inactive HR head", self.make_inactive_hr_head(), False),
        ])

    def test_is_hr_department(self):
        self.check(IsHRDepartment, [
            ("HR head", self.hr_head, True),
            ("HR staff", self.hr_staff, True),
            ("IT head", self.it_head, False),
            ("sales staff", self.sales_staff, False),
            ("login without employee", self.plain_user, False),
            ("anonymous", AnonymousUser(), False),
            ("inactive HR head", self.make_inactive_hr_head(), False),
        ])

    def test_is_hr_head(self):
        self.check(IsHRHead, [
            ("HR head", self.hr_head, True),
            ("HR staff", self.hr_staff, False),   # staff may NOT manage departments
            ("IT head", self.it_head, False),     # a head, but not of HR
            ("IT staff", self.it_staff, False),
            ("login without employee", self.plain_user, False),
            ("anonymous", AnonymousUser(), False),
            ("inactive HR head", self.make_inactive_hr_head(), False),
        ])

    def test_is_hr_head_has_friendly_message(self):
        # DRF shows `message` in the 403 body.
        self.assertIn("HR Department Head", IsHRHead.message)

    def test_attendance_permission_has_permission(self):
        # Any ACTIVE employee may reach the attendance endpoints at all;
        # which rows they see is decided by the queryset / object permission.
        self.check(AttendancePermission, [
            ("HR head", self.hr_head, True),
            ("IT staff", self.it_staff, True),
            ("no department", self.no_dept_staff, True),
            ("login without employee", self.plain_user, False),
            ("anonymous", AnonymousUser(), False),
            ("inactive HR head", self.make_inactive_hr_head(), False),
        ])


# ---------------------------------------------------------------------------
# AttendancePermission.has_object_permission
# ---------------------------------------------------------------------------
class AttendanceObjectPermissionTests(HRISTestCase):

    def setUp(self):
        self.perm = AttendancePermission()
        self.it_record = make_attendance(self.it_staff, date(2026, 10, 20))
        self.sales_record = make_attendance(self.sales_staff, date(2026, 10, 20))

    def allowed(self, who, record):
        return self.perm.has_object_permission(fake_request(user_of(who)), None, record)

    def test_hr_head_and_hr_staff_see_every_record(self):
        for hr in (self.hr_head, self.hr_staff):
            self.assertTrue(self.allowed(hr, self.it_record))
            self.assertTrue(self.allowed(hr, self.sales_record))

    def test_department_head_sees_own_department_only(self):
        self.assertTrue(self.allowed(self.it_head, self.it_record))
        self.assertFalse(self.allowed(self.it_head, self.sales_record))

    def test_head_without_department_sees_nothing_of_others(self):
        lonely_head = make_employee("lonely@nda.test", role="HEAD", department=None)
        self.assertFalse(self.allowed(lonely_head, self.it_record))

    def test_staff_sees_only_own_record(self):
        self.assertTrue(self.allowed(self.it_staff, self.it_record))
        self.assertFalse(self.allowed(self.it_staff2, self.it_record))   # same dept, still no
        self.assertFalse(self.allowed(self.sales_staff, self.it_record))

    def test_inactive_or_unlinked_users_see_nothing(self):
        inactive = make_employee("gone@nda.test", role="HEAD", department=self.hr, is_active=False)
        self.assertFalse(self.allowed(inactive, self.it_record))
        self.assertFalse(self.allowed(self.plain_user, self.it_record))

    def test_object_without_employee_is_refused(self):
        # Defensive branch: anything without an `.employee` is refused.
        self.assertFalse(self.allowed(self.hr_head, SimpleNamespace(employee=None)))
        self.assertFalse(self.allowed(self.hr_head, object()))
