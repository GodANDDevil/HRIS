"""
Tests for HRIS_APPS/serializers.py and HRIS_APPS/auth_serializers.py

Serializers are tested directly (no URL / view) so each rule is checked in
isolation. The same rules are then checked end-to-end in the test_views_* files.

Covers:
    as_drf_error()
    EmployeeSerializer   validate(), validate_email(), create(), update(), output fields
    DepartmentSerializer validate_name(), validate_department_head(),
                         get_department_head_name(), nested `employees`
    LeaveSerializer      create(), update(), read-only fields, output fields
    AttendanceSerializer output + everything read-only
    MeSerializer         get_is_hr(), department_name
    EmailOrUsernameTokenSerializer.validate()   (login by email OR username)
"""
from datetime import date
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from HRIS_APPS.auth_serializers import EmailOrUsernameTokenSerializer
from HRIS_APPS.models import Employee
from HRIS_APPS.serializers import (
    AttendanceSerializer,
    DepartmentSerializer,
    EmployeeSerializer,
    LeaveSerializer,
    MeSerializer,
    as_drf_error,
)

from .base import PASSWORD, HRISTestCase, kathmandu, make_attendance, make_employee, make_leave

User = get_user_model()


def ctx(employee_or_user):
    """Serializer context with a fake request made by this person."""
    user = getattr(employee_or_user, "user", employee_or_user)
    return {"request": SimpleNamespace(user=user)}


def new_employee_data(**overrides):
    """Valid POST body for EmployeeSerializer; override any field per test."""
    data = {
        "first_name": "New",
        "last_name": "Hire",
        "email": "new.hire@nda.test",
        "phone": "9800000000",
        "role": "STAFF",
        "hire_date": "2026-10-01",
        "department": None,
        "is_active": True,
        "password": "a-good-password",
    }
    data.update(overrides)
    return data


# ---------------------------------------------------------------------------
# as_drf_error
# ---------------------------------------------------------------------------
class AsDrfErrorTests(HRISTestCase):

    def test_field_errors_keep_their_field_names(self):
        err = as_drf_error(DjangoValidationError({"end_date": "Bad date."}))
        self.assertIsInstance(err, serializers.ValidationError)
        self.assertEqual(str(err.detail["end_date"][0]), "Bad date.")

    def test_plain_message_becomes_non_field_errors(self):
        err = as_drf_error(DjangoValidationError("Something is wrong."))
        self.assertEqual(str(err.detail["non_field_errors"][0]), "Something is wrong.")


# ---------------------------------------------------------------------------
# EmployeeSerializer
# ---------------------------------------------------------------------------
class EmployeeSerializerTests(HRISTestCase):

    def test_output_has_department_name_and_never_the_password(self):
        data = EmployeeSerializer(self.it_staff).data
        self.assertEqual(data["department_name"], "IT")
        self.assertNotIn("password", data)  # write_only

    # ---- validate_email ----
    def test_email_is_trimmed_and_lowercased(self):
        s = EmployeeSerializer(
            data=new_employee_data(email="  New.Hire@NDA.test ", department=self.it.id),
            context=ctx(self.hr_head),
        )
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["email"], "new.hire@nda.test")

    def test_duplicate_email_is_rejected_case_insensitively(self):
        s = EmployeeSerializer(
            data=new_employee_data(email="IT.STAFF@nda.test", department=self.it.id),
            context=ctx(self.hr_head),
        )
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)

    def test_keeping_own_email_on_update_is_allowed(self):
        s = EmployeeSerializer(
            self.it_staff, data={"email": "it.staff@nda.test"}, partial=True,
            context=ctx(self.hr_head),
        )
        self.assertTrue(s.is_valid(), s.errors)

    # ---- validate (HR head rule) ----
    def test_only_hr_head_can_create_an_hr_head(self):
        body = new_employee_data(role="HEAD", department=self.hr.id)

        refused = EmployeeSerializer(data=body, context=ctx(self.hr_staff))
        self.assertFalse(refused.is_valid())
        self.assertIn("department", refused.errors)

        allowed = EmployeeSerializer(data=body, context=ctx(self.hr_head))
        self.assertTrue(allowed.is_valid(), allowed.errors)

    def test_hr_head_rule_without_any_request_is_refused(self):
        s = EmployeeSerializer(data=new_employee_data(role="HEAD", department=self.hr.id))
        self.assertFalse(s.is_valid())

    def test_hr_staff_may_create_heads_of_other_departments(self):
        s = EmployeeSerializer(
            data=new_employee_data(role="HEAD", department=self.sales.id),
            context=ctx(self.hr_staff),
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_password_needs_8_characters(self):
        s = EmployeeSerializer(data=new_employee_data(password="short"), context=ctx(self.hr_head))
        self.assertFalse(s.is_valid())
        self.assertIn("password", s.errors)

    # ---- create ----
    def test_create_makes_employee_and_login_user(self):
        s = EmployeeSerializer(data=new_employee_data(department=self.it.id), context=ctx(self.hr_head))
        self.assertTrue(s.is_valid(), s.errors)
        emp = s.save()

        self.assertIsNotNone(emp.user)
        self.assertEqual(emp.user.username, "new.hire@nda.test")   # username == email
        self.assertEqual(emp.user.email, "new.hire@nda.test")
        self.assertEqual(emp.user.first_name, "New")
        self.assertTrue(emp.user.check_password("a-good-password"))  # hashed, not plain

    def test_create_without_password_fails(self):
        body = new_employee_data()
        body.pop("password")
        s = EmployeeSerializer(data=body, context=ctx(self.hr_head))
        self.assertTrue(s.is_valid(), s.errors)  # password is optional for updates...
        with self.assertRaises(serializers.ValidationError) as c:
            s.save()                              # ...but required to create
        self.assertIn("password", c.exception.detail)
        self.assertFalse(Employee.objects.filter(email="new.hire@nda.test").exists())

    def test_create_fails_if_login_with_that_email_already_exists(self):
        User.objects.create_user(username="new.hire@nda.test", password="x")
        s = EmployeeSerializer(data=new_employee_data(), context=ctx(self.hr_head))
        self.assertTrue(s.is_valid(), s.errors)
        with self.assertRaises(serializers.ValidationError) as c:
            s.save()
        self.assertIn("email", c.exception.detail)

    # ---- update ----
    def test_update_syncs_login_user(self):
        s = EmployeeSerializer(
            self.it_staff,
            data={"email": "gita.new@nda.test", "first_name": "Geeta", "is_active": False},
            partial=True, context=ctx(self.hr_head),
        )
        self.assertTrue(s.is_valid(), s.errors)
        s.save()

        user = User.objects.get(pk=self.it_staff.user.pk)
        self.assertEqual(user.username, "gita.new@nda.test")
        self.assertEqual(user.email, "gita.new@nda.test")
        self.assertEqual(user.first_name, "Geeta")
        self.assertFalse(user.is_active)  # deactivated employee can no longer log in

    def test_update_with_password_changes_it(self):
        s = EmployeeSerializer(
            self.it_staff, data={"password": "brand-new-pass"}, partial=True, context=ctx(self.hr_head),
        )
        self.assertTrue(s.is_valid(), s.errors)
        s.save()
        user = User.objects.get(pk=self.it_staff.user.pk)
        self.assertTrue(user.check_password("brand-new-pass"))

    def test_update_without_password_keeps_old_one(self):
        s = EmployeeSerializer(self.it_staff, data={"phone": "1234"}, partial=True, context=ctx(self.hr_head))
        self.assertTrue(s.is_valid(), s.errors)
        s.save()
        user = User.objects.get(pk=self.it_staff.user.pk)
        self.assertTrue(user.check_password(PASSWORD))

    def test_update_employee_without_login_does_not_crash(self):
        emp = make_employee("nologin@nda.test", department=self.it, with_login=False)
        s = EmployeeSerializer(emp, data={"phone": "555"}, partial=True, context=ctx(self.hr_head))
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.save().phone, "555")


# ---------------------------------------------------------------------------
# DepartmentSerializer
# ---------------------------------------------------------------------------
class DepartmentSerializerTests(HRISTestCase):

    def test_output_has_head_name_and_light_member_list(self):
        data = DepartmentSerializer(self.it).data
        self.assertEqual(data["department_head_name"], "Ram Lead")
        self.assertEqual(len(data["employees"]), 3)
        # Members expose only id/name/role - no email or phone leaks.
        self.assertEqual(set(data["employees"][0].keys()), {"id", "first_name", "last_name", "role"})

    def test_head_name_is_none_without_head(self):
        self.assertIsNone(DepartmentSerializer(self.sales).data["department_head_name"])

    def test_name_is_trimmed(self):
        s = DepartmentSerializer(data={"name": "  Finance  "})
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["name"], "Finance")

    def test_blank_name_is_rejected(self):
        s = DepartmentSerializer(data={"name": "   "})
        self.assertFalse(s.is_valid())
        self.assertIn("name", s.errors)

    def test_duplicate_name_is_rejected_case_insensitively(self):
        s = DepartmentSerializer(data={"name": "it"})
        self.assertFalse(s.is_valid())
        self.assertIn("name", s.errors)

    def test_renaming_to_own_name_is_allowed(self):
        s = DepartmentSerializer(self.it, data={"name": "IT"}, partial=True)
        self.assertTrue(s.is_valid(), s.errors)

    def test_hr_department_must_keep_hr_in_its_name(self):
        bad = DepartmentSerializer(self.hr, data={"name": "Finance"}, partial=True)
        self.assertFalse(bad.is_valid())
        self.assertIn("name", bad.errors)

        good = DepartmentSerializer(self.hr, data={"name": "HR & Admin"}, partial=True)
        self.assertTrue(good.is_valid(), good.errors)

    def test_department_head_must_have_head_role(self):
        s = DepartmentSerializer(data={"name": "Ops", "department_head": self.it_staff.id})
        self.assertFalse(s.is_valid())
        self.assertIn("department_head", s.errors)

    def test_validate_department_head_method_directly(self):
        # Also call the method itself: STAFF refused, HEAD and None accepted.
        s = DepartmentSerializer()
        with self.assertRaises(serializers.ValidationError):
            s.validate_department_head(self.it_staff)
        self.assertEqual(s.validate_department_head(self.it_head), self.it_head)
        self.assertIsNone(s.validate_department_head(None))


# ---------------------------------------------------------------------------
# LeaveSerializer
# ---------------------------------------------------------------------------
class LeaveSerializerTests(HRISTestCase):
    BODY = {"leave_type": "CASUAL", "start_date": "2026-11-02", "end_date": "2026-11-03", "reason": "Family"}

    def test_create_fills_employee_and_computed_fields(self):
        s = LeaveSerializer(data=self.BODY)
        self.assertTrue(s.is_valid(), s.errors)
        leave = s.save(employee=self.it_staff)   # the view passes the logged-in employee
        self.assertEqual(leave.total_days, 2)
        self.assertEqual(leave.department, self.it)

        out = LeaveSerializer(leave).data
        self.assertEqual(out["employee_name"], "Gita Dev (STAFF)")
        self.assertEqual(out["department_name"], "IT")
        self.assertEqual(out["department_id"], self.it.id)
        self.assertEqual(out["designation"], "STAFF")
        self.assertEqual(out["status"], "PENDING")
        self.assertIn("created_at", out)

    def test_read_only_fields_cannot_be_set_by_client(self):
        # A client trying to self-approve or file for someone else is ignored.
        body = dict(self.BODY, status="APPROVED", employee=self.sales_staff.id, total_days=99)
        s = LeaveSerializer(data=body)
        self.assertTrue(s.is_valid(), s.errors)
        for field in ("status", "employee", "total_days"):
            self.assertNotIn(field, s.validated_data)

    def test_employee_without_department_gets_clear_error(self):
        s = LeaveSerializer(data=self.BODY)
        self.assertTrue(s.is_valid(), s.errors)
        with self.assertRaises(serializers.ValidationError) as c:
            s.save(employee=self.no_dept_staff)
        self.assertIn("employee", c.exception.detail)

    def test_model_errors_become_drf_errors_on_create(self):
        # Limit exceeded inside Leave.clean() -> DRF ValidationError (400), not a 500.
        make_leave(self.it_staff, date(2026, 10, 1), days=6)
        s = LeaveSerializer(data=self.BODY)
        self.assertTrue(s.is_valid(), s.errors)
        with self.assertRaises(serializers.ValidationError) as c:
            s.save(employee=self.it_staff)
        self.assertIn("limit exceeded", str(c.exception.detail))

    def test_end_before_start_becomes_field_error(self):
        s = LeaveSerializer(data=dict(self.BODY, end_date="2026-11-01"))
        self.assertTrue(s.is_valid(), s.errors)
        with self.assertRaises(serializers.ValidationError) as c:
            s.save(employee=self.it_staff)
        self.assertIn("end_date", c.exception.detail)

    def test_model_errors_become_drf_errors_on_update(self):
        leave = make_leave(self.it_staff, date(2026, 11, 2), days=2)
        s = LeaveSerializer(leave, data={"end_date": "2026-11-01"}, partial=True)
        self.assertTrue(s.is_valid(), s.errors)
        with self.assertRaises(serializers.ValidationError):
            s.save()

    def test_update_success(self):
        leave = make_leave(self.it_staff, date(2026, 11, 2), days=2)
        s = LeaveSerializer(leave, data={"end_date": "2026-11-04"}, partial=True)
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.save().total_days, 3)

    def test_unknown_leave_type_is_rejected(self):
        s = LeaveSerializer(data=dict(self.BODY, leave_type="HOLIDAY"))
        self.assertFalse(s.is_valid())
        self.assertIn("leave_type", s.errors)


# ---------------------------------------------------------------------------
# AttendanceSerializer
# ---------------------------------------------------------------------------
class AttendanceSerializerTests(HRISTestCase):

    def test_output_fields(self):
        rec = make_attendance(
            self.it_staff, date(2026, 10, 20),
            check_in=kathmandu(2026, 10, 20, 9, 0), check_out=kathmandu(2026, 10, 20, 17, 30),
        )
        data = AttendanceSerializer(rec).data
        self.assertEqual(data["employee"], self.it_staff.id)
        self.assertEqual(data["employee_name"], "Gita Dev (STAFF)")
        self.assertEqual(data["date"], "2026-10-20")
        self.assertEqual(data["working_hours"], "08:30:00")
        self.assertEqual(data["formatted_working_hours"], "8h 30m")  # the field that used to 500
        self.assertEqual(data["status"], "PRESENT")

    def test_every_field_is_read_only(self):
        # Attendance can only be written by check-in / check-out.
        s = AttendanceSerializer(data={
            "employee": self.it_staff.id, "date": "2026-10-20", "status": "PRESENT",
            "check_in": "2026-10-20T09:00:00+05:45",
        })
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(dict(s.validated_data), {})


# ---------------------------------------------------------------------------
# MeSerializer
# ---------------------------------------------------------------------------
class MeSerializerTests(HRISTestCase):

    def test_is_hr_true_for_hr_people(self):
        self.assertTrue(MeSerializer(self.hr_head).data["is_hr"])
        self.assertTrue(MeSerializer(self.hr_staff).data["is_hr"])

    def test_is_hr_false_for_others(self):
        data = MeSerializer(self.it_head).data
        self.assertFalse(data["is_hr"])
        self.assertEqual(data["department_name"], "IT")

    def test_department_name_none_without_department(self):
        self.assertIsNone(MeSerializer(self.no_dept_staff).data["department_name"])

    def test_no_password_or_user_in_output(self):
        data = MeSerializer(self.it_staff).data
        self.assertNotIn("password", data)
        self.assertNotIn("user", data)


# ---------------------------------------------------------------------------
# EmailOrUsernameTokenSerializer
# ---------------------------------------------------------------------------
class EmailOrUsernameTokenSerializerTests(HRISTestCase):

    def setUp(self):
        # A login whose username is NOT the email, to prove the email lookup works.
        self.user = User.objects.create_user(username="ramesh", email="Ramesh@NDA.test", password=PASSWORD)

    def tokens_for(self, login):
        s = EmailOrUsernameTokenSerializer(data={"username": login, "password": PASSWORD})
        s.is_valid(raise_exception=True)
        return s.validated_data

    def test_login_with_username(self):
        self.assertIn("access", self.tokens_for("ramesh"))

    def test_login_with_email(self):
        tokens = self.tokens_for("Ramesh@NDA.test")
        self.assertIn("access", tokens)
        self.assertIn("refresh", tokens)

    def test_email_is_case_insensitive(self):
        self.assertIn("access", self.tokens_for("ramesh@nda.test"))

    def test_wrong_password_fails(self):
        s = EmailOrUsernameTokenSerializer(data={"username": "ramesh@nda.test", "password": "nope"})
        with self.assertRaises(AuthenticationFailed):
            s.is_valid(raise_exception=True)

    def test_unknown_email_fails(self):
        s = EmailOrUsernameTokenSerializer(data={"username": "ghost@nda.test", "password": PASSWORD})
        with self.assertRaises(AuthenticationFailed):
            s.is_valid(raise_exception=True)
