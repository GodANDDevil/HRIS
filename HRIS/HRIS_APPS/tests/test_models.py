"""
Tests for HRIS_APPS/models.py

Covers every model method:
    Employee.__str__                     + field defaults / unique email / cascades
    Department.__str__                   + department_head SET_NULL
    Leave.save()   -> total_days, department, designation, full_clean()
    Leave.clean()  -> end-before-start, 6-month leave limits (LEAVE_LIMITS)
    Leave.__str__
    Attendance.save()  -> working_hours + every status:
                          ABSENT, CHECKED_IN, LATE, PRESENT, EARLY_DEPARTURE, ON_LEAVE
    Attendance.clean() -> check-out before check-in
    Attendance.formatted_working_hours()
    Attendance.__str__, Meta.ordering, one-record-per-day constraint
"""
from datetime import date, timedelta, datetime, timezone as dt_timezone

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from HRIS_APPS.models import (
    LEAVE_LIMITS, LEAVE_TYPE_CHOICES, Attendance, Department, Employee, Leave,
)

from .base import (
    HRISTestCase, freeze_time, kathmandu, make_attendance, make_leave,
)

# A fixed Monday used as the start of most leave tests.
NOV_2 = date(2026, 11, 2)


# ---------------------------------------------------------------------------
# Employee
# ---------------------------------------------------------------------------
class EmployeeModelTests(HRISTestCase):

    def test_str_shows_full_name_and_role(self):
        # __str__ is used in the admin and as `employee_name` in API responses.
        self.assertEqual(str(self.it_staff), "Gita Dev (STAFF)")
        self.assertEqual(str(self.it_head), "Ram Lead (HEAD)")

    def test_defaults_role_staff_and_active(self):
        # role and is_active have defaults, so a minimal employee is an active STAFF.
        emp = Employee.objects.create(
            first_name="A", last_name="B", email="ab@nda.test", hire_date="2025-01-01",
        )
        self.assertEqual(emp.role, "STAFF")
        self.assertTrue(emp.is_active)
        self.assertIsNone(emp.user)        # login is optional at model level
        self.assertIsNone(emp.department)  # department is optional at model level

    def test_email_must_be_unique(self):
        # email has unique=True; the DB refuses a second row with the same email.
        with self.assertRaises(IntegrityError), transaction.atomic():
            Employee.objects.create(
                first_name="Dup", last_name="Dup", email=self.it_staff.email,
                hire_date="2025-01-01",
            )

    def test_deleting_login_user_deletes_employee(self):
        # Employee.user is on_delete=CASCADE.
        emp_id = self.sales_staff.id
        self.sales_staff.user.delete()
        self.assertFalse(Employee.objects.filter(id=emp_id).exists())

    def test_deleting_department_deletes_its_employees(self):
        # Employee.department is on_delete=CASCADE. This is WHY
        # DepartmentViewSet.destroy refuses to delete a department with people in it.
        emp_id = self.sales_staff.id
        self.sales.delete()
        self.assertFalse(Employee.objects.filter(id=emp_id).exists())


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------
class DepartmentModelTests(HRISTestCase):

    def test_str_is_name(self):
        self.assertEqual(str(self.it), "IT")

    def test_employees_reverse_relation(self):
        # Employee.department has related_name="employees".
        self.assertEqual(
            set(self.it.employees.values_list("id", flat=True)),
            {self.it_head.id, self.it_staff.id, self.it_staff2.id},
        )

    def test_head_is_cleared_when_head_employee_is_deleted(self):
        # department_head is on_delete=SET_NULL: the department survives.
        self.it_head.delete()
        self.it.refresh_from_db()
        self.assertIsNone(self.it.department_head)

    def test_name_must_be_unique(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Department.objects.create(name="IT")


# ---------------------------------------------------------------------------
# Leave.save() / Leave.clean()
# ---------------------------------------------------------------------------
class LeaveSaveTests(HRISTestCase):

    def test_total_days_counts_both_start_and_end(self):
        # Nov 2 -> Nov 4 is 3 days (inclusive), not 2.
        leave = make_leave(self.it_staff, NOV_2, days=3)
        self.assertEqual(leave.total_days, 3)

    def test_single_day_leave_is_one_day(self):
        leave = make_leave(self.it_staff, NOV_2, days=1)
        self.assertEqual(leave.total_days, 1)

    def test_total_days_is_recalculated_on_every_save(self):
        # Even if someone types a wrong total_days, save() overwrites it from the dates.
        leave = make_leave(self.it_staff, NOV_2, days=2)
        leave.total_days = 99
        leave.save()
        self.assertEqual(leave.total_days, 2)

    def test_department_and_designation_are_copied_from_employee(self):
        # Both fields are editable=False and always come from the employee.
        leave = make_leave(self.it_head, NOV_2)
        self.assertEqual(leave.department, self.it)
        self.assertEqual(leave.designation, "HEAD")

        leave = make_leave(self.sales_staff, NOV_2)
        self.assertEqual(leave.department, self.sales)
        self.assertEqual(leave.designation, "STAFF")

    def test_defaults_pending_and_casual(self):
        leave = Leave.objects.create(
            employee=self.it_staff, start_date=NOV_2, end_date=NOV_2,
        )
        self.assertEqual(leave.status, "PENDING")
        self.assertEqual(leave.leave_type, "CASUAL")

    def test_end_date_before_start_date_is_rejected(self):
        # Leave.clean() raises an error on the end_date field.
        with self.assertRaises(ValidationError) as ctx:
            Leave.objects.create(
                employee=self.it_staff, start_date=NOV_2, end_date=NOV_2 - timedelta(days=1),
            )
        self.assertIn("end_date", ctx.exception.message_dict)
        self.assertFalse(Leave.objects.exists())  # nothing was saved

    def test_employee_without_department_cannot_have_leave(self):
        # Leave.department is required; save() copies None from the employee
        # and full_clean() refuses it. (The API turns this into a friendly 400.)
        with self.assertRaises(ValidationError) as ctx:
            make_leave(self.no_dept_staff, NOV_2)
        self.assertIn("department", ctx.exception.message_dict)

    def test_str(self):
        leave = make_leave(self.it_staff, NOV_2, days=2)
        self.assertEqual(str(leave), "Gita Dev (STAFF) - PENDING (2026-11-02 to 2026-11-03)")


class LeaveLimitTests(HRISTestCase):
    """
    LEAVE_LIMITS: ANNUAL 10, SICK 15, CASUAL 6, FESTIVE 6 days per 180 days.
    APPROVED + PENDING leave counts; REJECTED does not. Other types are unlimited.
    """

    def test_limits_table_matches_the_policy(self):
        # Guard against someone silently changing the policy numbers.
        self.assertEqual(LEAVE_LIMITS, {"ANNUAL": 10, "SICK": 15, "CASUAL": 6, "FESTIVE": 6})

    def test_using_exactly_the_limit_is_allowed_and_one_more_day_is_not(self):
        # Run once for each limited type. subTest reports which type failed.
        for leave_type, limit in LEAVE_LIMITS.items():
            with self.subTest(leave_type=leave_type):
                make_leave(self.it_staff, NOV_2, days=limit, leave_type=leave_type)

                next_day = NOV_2 + timedelta(days=limit)
                with self.assertRaises(ValidationError) as ctx:
                    make_leave(self.it_staff, next_day, days=1, leave_type=leave_type)
                self.assertIn("limit exceeded", str(ctx.exception))

    def test_limit_is_counted_across_several_requests(self):
        # 4 + 2 = 6 casual days is fine, the 7th day is refused.
        make_leave(self.it_staff, NOV_2, days=4)
        make_leave(self.it_staff, NOV_2 + timedelta(days=10), days=2)
        with self.assertRaises(ValidationError):
            make_leave(self.it_staff, NOV_2 + timedelta(days=20), days=1)

    def test_limit_is_per_employee(self):
        # Gita using all her casual leave does not affect Bikash.
        make_leave(self.it_staff, NOV_2, days=6)
        make_leave(self.it_staff2, NOV_2, days=6)  # no error

    def test_limit_is_per_leave_type(self):
        # Using all casual leave still leaves sick leave available.
        make_leave(self.it_staff, NOV_2, days=6, leave_type="CASUAL")
        make_leave(self.it_staff, NOV_2 + timedelta(days=7), days=5, leave_type="SICK")

    def test_rejected_leave_does_not_count(self):
        make_leave(self.it_staff, NOV_2, days=6, status="REJECTED")
        make_leave(self.it_staff, NOV_2 + timedelta(days=7), days=6)  # no error

    def test_pending_leave_counts(self):
        make_leave(self.it_staff, NOV_2, days=6, status="PENDING")
        with self.assertRaises(ValidationError):
            make_leave(self.it_staff, NOV_2 + timedelta(days=7), days=1)

    def test_approved_leave_counts(self):
        make_leave(self.it_staff, NOV_2, days=6, status="APPROVED")
        with self.assertRaises(ValidationError):
            make_leave(self.it_staff, NOV_2 + timedelta(days=7), days=1)

    def test_leave_older_than_180_days_does_not_count(self):
        # The window is [new start - 180 days, new start].
        old_start = date(2026, 1, 1)
        make_leave(self.it_staff, old_start, days=6)
        make_leave(self.it_staff, old_start + timedelta(days=181), days=6)  # outside window: OK

    def test_leave_exactly_180_days_ago_still_counts(self):
        # Boundary: start_date__gte includes day 180 itself.
        old_start = date(2026, 1, 1)
        make_leave(self.it_staff, old_start, days=6)
        with self.assertRaises(ValidationError):
            make_leave(self.it_staff, old_start + timedelta(days=180), days=1)

    def test_resaving_a_leave_does_not_count_itself_twice(self):
        # clean() excludes its own pk, so approving a 6-day casual leave
        # (which is exactly the limit) must not fail.
        leave = make_leave(self.it_staff, NOV_2, days=6)
        leave.status = "APPROVED"
        leave.save()  # no error
        self.assertEqual(Leave.objects.get(pk=leave.pk).status, "APPROVED")

    def test_unlimited_leave_types_have_no_limit(self):
        unlimited = [code for code, _ in LEAVE_TYPE_CHOICES if code not in LEAVE_LIMITS]
        self.assertEqual(set(unlimited), {"STUDY", "HALF_DAY", "UNPAID", "EMERGENCY", "OTHERS"})
        for i, leave_type in enumerate(unlimited):
            with self.subTest(leave_type=leave_type):
                start = NOV_2 + timedelta(days=i * 100)
                make_leave(self.it_staff, start, days=40, leave_type=leave_type)
                make_leave(self.it_staff, start + timedelta(days=45), days=40, leave_type=leave_type)

    def test_limit_only_counts_earlier_leaves_current_behaviour(self):
        # NOTE / possible bug: clean() only looks BACKWARDS from the new start
        # date (start_date__lte=self.start_date). Booking 6 casual days in
        # December and then 6 more in November is accepted, i.e. 12 days inside
        # one 6-month span. This test pins today's behaviour; if you change the
        # rule to look both ways, change this test to expect a ValidationError.
        make_leave(self.it_staff, date(2026, 12, 1), days=6)
        make_leave(self.it_staff, date(2026, 11, 1), days=6)  # currently allowed
        self.assertEqual(Leave.objects.filter(employee=self.it_staff).count(), 2)


# ---------------------------------------------------------------------------
# Attendance.save() / Attendance.clean() / helpers
# ---------------------------------------------------------------------------
class AttendanceSaveTests(HRISTestCase):
    DAY = date(2026, 10, 20)

    def test_date_defaults_to_local_today_not_utc(self):
        # At 00:30 in Kathmandu it is still the 19th in UTC. The default is
        # timezone.localdate, so the record must be dated the 20th.
        with freeze_time(kathmandu(2026, 10, 20, 0, 30)):
            rec = Attendance.objects.create(employee=self.it_staff)
        self.assertEqual(rec.date, date(2026, 10, 20))

    def test_no_check_in_is_absent(self):
        rec = make_attendance(self.it_staff, self.DAY)
        self.assertEqual(rec.status, "ABSENT")
        self.assertIsNone(rec.working_hours)

    def test_check_in_before_11_without_check_out_is_checked_in(self):
        rec = make_attendance(self.it_staff, self.DAY, check_in=kathmandu(2026, 10, 20, 9, 0))
        self.assertEqual(rec.status, "CHECKED_IN")

    def test_check_in_at_10_59_is_not_late(self):
        rec = make_attendance(self.it_staff, self.DAY, check_in=kathmandu(2026, 10, 20, 10, 59))
        self.assertEqual(rec.status, "CHECKED_IN")

    def test_check_in_at_exactly_11_00_is_late(self):
        rec = make_attendance(self.it_staff, self.DAY, check_in=kathmandu(2026, 10, 20, 11, 0))
        self.assertEqual(rec.status, "LATE")

    def test_late_rule_uses_kathmandu_time_not_utc(self):
        # 05:30 UTC == 11:15 in Kathmandu -> LATE (would be "on time" if compared in UTC).
        utc_0530 = datetime(2026, 10, 20, 5, 30, tzinfo=dt_timezone.utc)
        rec = make_attendance(self.it_staff, self.DAY, check_in=utc_0530)
        self.assertEqual(rec.status, "LATE")

        # 04:00 UTC == 09:45 in Kathmandu -> not late.
        utc_0400 = datetime(2026, 10, 21, 4, 0, tzinfo=dt_timezone.utc)
        rec2 = make_attendance(self.it_staff, date(2026, 10, 21), check_in=utc_0400)
        self.assertEqual(rec2.status, "CHECKED_IN")

    def test_full_8_hours_is_present_and_working_hours_calculated(self):
        rec = make_attendance(
            self.it_staff, self.DAY,
            check_in=kathmandu(2026, 10, 20, 9, 0),
            check_out=kathmandu(2026, 10, 20, 17, 0),
        )
        self.assertEqual(rec.working_hours, timedelta(hours=8))
        self.assertEqual(rec.status, "PRESENT")

    def test_less_than_8_hours_is_early_departure(self):
        rec = make_attendance(
            self.it_staff, self.DAY,
            check_in=kathmandu(2026, 10, 20, 9, 0),
            check_out=kathmandu(2026, 10, 20, 16, 59),
        )
        self.assertEqual(rec.status, "EARLY_DEPARTURE")

    def test_late_wins_over_present(self):
        # A late arrival stays LATE even after a full day's work.
        rec = make_attendance(
            self.it_staff, self.DAY,
            check_in=kathmandu(2026, 10, 20, 11, 30),
            check_out=kathmandu(2026, 10, 20, 20, 0),
        )
        self.assertEqual(rec.status, "LATE")

    def test_approved_leave_on_that_day_is_on_leave(self):
        # ON_LEAVE wins over everything, even if the employee checked in.
        make_leave(self.it_staff, date(2026, 10, 19), days=3, leave_type="SICK", status="APPROVED")
        rec = make_attendance(self.it_staff, self.DAY, check_in=kathmandu(2026, 10, 20, 9, 0))
        self.assertEqual(rec.status, "ON_LEAVE")

    def test_pending_or_rejected_leave_does_not_mark_on_leave(self):
        make_leave(self.it_staff, self.DAY, days=1, leave_type="SICK", status="PENDING")
        make_leave(self.it_staff2, self.DAY, days=1, leave_type="SICK", status="REJECTED")
        self.assertEqual(make_attendance(self.it_staff, self.DAY).status, "ABSENT")
        self.assertEqual(make_attendance(self.it_staff2, self.DAY).status, "ABSENT")

    def test_leave_of_another_employee_is_ignored(self):
        make_leave(self.it_staff2, self.DAY, days=1, status="APPROVED")
        self.assertEqual(make_attendance(self.it_staff, self.DAY).status, "ABSENT")

    def test_check_out_before_check_in_is_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            make_attendance(
                self.it_staff, self.DAY,
                check_in=kathmandu(2026, 10, 20, 17, 0),
                check_out=kathmandu(2026, 10, 20, 9, 0),
            )
        self.assertIn("check_out", ctx.exception.message_dict)

    def test_only_one_record_per_employee_per_day(self):
        # UniqueConstraint(employee, date). full_clean() in save() normally
        # catches it as a ValidationError; the DB constraint is the backstop.
        make_attendance(self.it_staff, self.DAY)
        with self.assertRaises((ValidationError, IntegrityError)), transaction.atomic():
            make_attendance(self.it_staff, self.DAY)
        # Another employee on the same day is fine.
        make_attendance(self.it_staff2, self.DAY)

    def test_records_are_ordered_newest_date_first(self):
        make_attendance(self.it_staff, date(2026, 10, 18))
        make_attendance(self.it_staff, date(2026, 10, 20))
        make_attendance(self.it_staff, date(2026, 10, 19))
        dates = list(Attendance.objects.values_list("date", flat=True))
        self.assertEqual(dates, [date(2026, 10, 20), date(2026, 10, 19), date(2026, 10, 18)])

    def test_str(self):
        rec = make_attendance(self.it_staff, self.DAY)
        self.assertEqual(str(rec), "Gita Dev (STAFF) - 2026-10-20 (ABSENT)")


class FormattedWorkingHoursTests(HRISTestCase):

    def test_dash_when_no_hours(self):
        rec = Attendance(employee=self.it_staff, working_hours=None)
        self.assertEqual(rec.formatted_working_hours(), "–")  # en dash

    def test_hours_and_minutes(self):
        rec = Attendance(employee=self.it_staff, working_hours=timedelta(hours=8, minutes=30))
        self.assertEqual(rec.formatted_working_hours(), "8h 30m")

    def test_under_one_hour(self):
        rec = Attendance(employee=self.it_staff, working_hours=timedelta(minutes=45))
        self.assertEqual(rec.formatted_working_hours(), "0h 45m")

    def test_seconds_are_dropped(self):
        rec = Attendance(employee=self.it_staff, working_hours=timedelta(hours=1, minutes=2, seconds=59))
        self.assertEqual(rec.formatted_working_hours(), "1h 2m")
