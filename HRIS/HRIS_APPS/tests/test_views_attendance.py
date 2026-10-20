"""
Tests for AttendanceViewSet (HRIS_APPS/views.py)

    GET  /api/attendance/                       list       scoped by get_queryset()
    GET  /api/attendance/<id>/                  retrieve   scoped + has_object_permission
    POST /api/attendance/check-in/<emp_id>/     check_in   action
    POST /api/attendance/check-out/<emp_id>/    check_out  action
    POST/PUT/PATCH/DELETE on the list/detail    -> 405 (read-only viewset)

Also covers check_employee_access(): you can only check in/out for YOURSELF.

The clock is frozen with freeze_time() so "today", the 11:00 late rule and
working hours are the same no matter when the tests run.
"""
from datetime import date

from HRIS_APPS.models import Attendance

from .base import HRISTestCase, freeze_time, kathmandu, make_attendance, make_employee, make_leave

LIST = "/api/attendance/"
TODAY = date(2026, 10, 20)


def detail(pk):
    return f"/api/attendance/{pk}/"


def check_in(emp_id):
    return f"/api/attendance/check-in/{emp_id}/"


def check_out(emp_id):
    return f"/api/attendance/check-out/{emp_id}/"


def at(hour, minute=0):
    """A moment on TODAY in Kathmandu time."""
    return kathmandu(2026, 10, 20, hour, minute)


# ---------------------------------------------------------------------------
# list / retrieve
# ---------------------------------------------------------------------------
class AttendanceReadTests(HRISTestCase):

    def setUp(self):
        yesterday = date(2026, 10, 19)
        self.it_rec = make_attendance(self.it_staff, yesterday)
        self.it2_rec = make_attendance(self.it_staff2, yesterday)
        self.sales_rec = make_attendance(self.sales_staff, yesterday)
        self.hr_rec = make_attendance(self.hr_staff, yesterday)
        self.all_ids = {self.it_rec.id, self.it2_rec.id, self.sales_rec.id, self.hr_rec.id}

    def test_anonymous_gets_401(self):
        self.assertEqual(self.client.get(LIST).status_code, 401)

    def test_login_without_profile_gets_403(self):
        # AttendancePermission.has_permission needs an active employee.
        self.login_as(self.plain_user)
        self.assertEqual(self.client.get(LIST).status_code, 403)

    def test_inactive_employee_gets_403(self):
        gone = make_employee("gone@nda.test", role="HEAD", department=self.hr, is_active=False)
        self.login_as(gone)
        self.assertEqual(self.client.get(LIST).status_code, 403)

    def test_hr_sees_everything(self):
        for who in (self.hr_head, self.hr_staff):
            with self.subTest(who=str(who)):
                self.login_as(who)
                self.assertEqual(self.ids(self.client.get(LIST)), self.all_ids)

    def test_department_head_sees_department(self):
        self.login_as(self.it_head)
        self.assertEqual(self.ids(self.client.get(LIST)), {self.it_rec.id, self.it2_rec.id})

    def test_staff_sees_own(self):
        self.login_as(self.it_staff)
        self.assertEqual(self.ids(self.client.get(LIST)), {self.it_rec.id})

    def test_head_without_department_current_behaviour(self):
        # NOTE / possible bug: get_queryset() filters a HEAD by
        # employee__department=<their department>. For a head with NO
        # department that becomes department=None, so they see every
        # department-less employee's attendance. Flip this if you change it.
        lonely_head = make_employee("lonely@nda.test", role="HEAD", department=None)
        rec = make_attendance(self.no_dept_staff, date(2026, 10, 19))
        self.login_as(lonely_head)
        self.assertIn(rec.id, self.ids(self.client.get(LIST)))

    def test_row_shape(self):
        self.login_as(self.it_staff)
        row = self.client.get(LIST).json()[0]
        self.assertEqual(row["employee"], self.it_staff.id)
        self.assertEqual(row["employee_name"], "Gita Dev (STAFF)")
        self.assertEqual(row["status"], "ABSENT")
        self.assertEqual(row["formatted_working_hours"], "–")

    def test_retrieve_rules(self):
        cases = [
            ("staff own", self.it_staff, self.it_rec, 200),
            ("staff colleague", self.it_staff, self.it2_rec, 404),
            ("head own dept", self.it_head, self.it2_rec, 200),
            ("head other dept", self.it_head, self.sales_rec, 404),
            ("HR any", self.hr_staff, self.sales_rec, 200),
        ]
        for label, who, rec, expected in cases:
            with self.subTest(case=label):
                self.login_as(who)
                self.assertEqual(self.client.get(detail(rec.id)).status_code, expected)

    def test_records_cannot_be_written_directly(self):
        # Read-only viewset: nobody (not even HR) can fabricate or edit attendance.
        self.login_as(self.hr_head)
        self.assertEqual(self.client.post(LIST, {"employee": self.it_staff.id}, format="json").status_code, 405)
        self.assertEqual(self.client.patch(detail(self.it_rec.id), {"status": "PRESENT"}, format="json").status_code, 405)
        self.assertEqual(self.client.put(detail(self.it_rec.id), {"status": "PRESENT"}, format="json").status_code, 405)
        self.assertEqual(self.client.delete(detail(self.it_rec.id)).status_code, 405)


# ---------------------------------------------------------------------------
# check-in
# ---------------------------------------------------------------------------
class CheckInTests(HRISTestCase):

    def test_first_check_in_creates_record(self):
        self.login_as(self.it_staff)
        with freeze_time(at(9, 0)):
            res = self.client.post(check_in(self.it_staff.id))
        self.assertEqual(res.status_code, 201, res.json())
        body = res.json()
        self.assertEqual(body["date"], "2026-10-20")
        self.assertEqual(body["status"], "CHECKED_IN")
        self.assertIsNotNone(body["check_in"])
        self.assertIsNone(body["check_out"])
        self.assertEqual(Attendance.objects.filter(employee=self.it_staff, date=TODAY).count(), 1)

    def test_check_in_after_11_is_late(self):
        self.login_as(self.it_staff)
        with freeze_time(at(11, 5)):
            res = self.client.post(check_in(self.it_staff.id))
        self.assertEqual(res.json()["status"], "LATE")

    def test_check_in_on_approved_leave_day_is_on_leave(self):
        make_leave(self.it_staff, TODAY, days=1, leave_type="SICK", status="APPROVED")
        self.login_as(self.it_staff)
        with freeze_time(at(9, 0)):
            res = self.client.post(check_in(self.it_staff.id))
        self.assertEqual(res.json()["status"], "ON_LEAVE")

    def test_second_check_in_same_day_is_refused(self):
        self.login_as(self.it_staff)
        with freeze_time(at(9, 0)):
            self.client.post(check_in(self.it_staff.id))
        with freeze_time(at(9, 30)):
            res = self.client.post(check_in(self.it_staff.id))
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"], "Already checked in today.")

    def test_existing_empty_record_is_reused_with_200(self):
        # get_or_create finds today's ABSENT row -> 200 OK instead of 201 Created.
        make_attendance(self.it_staff, TODAY)
        self.login_as(self.it_staff)
        with freeze_time(at(9, 0)):
            res = self.client.post(check_in(self.it_staff.id))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "CHECKED_IN")
        self.assertEqual(Attendance.objects.filter(employee=self.it_staff).count(), 1)

    def test_new_day_gets_a_new_record(self):
        self.login_as(self.it_staff)
        with freeze_time(at(9, 0)):
            self.client.post(check_in(self.it_staff.id))
        with freeze_time(kathmandu(2026, 10, 21, 9, 0)):
            res = self.client.post(check_in(self.it_staff.id))
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["date"], "2026-10-21")

    def test_cannot_check_in_for_someone_else(self):
        # Not even HR: check_employee_access() only allows your own id.
        for who in (self.it_staff, self.hr_head):
            with self.subTest(who=str(who)):
                self.login_as(who)
                with freeze_time(at(9, 0)):
                    res = self.client.post(check_in(self.it_staff2.id))
                self.assertEqual(res.status_code, 403)
                self.assertIn("own account", res.json()["error"])
        self.assertFalse(Attendance.objects.filter(employee=self.it_staff2).exists())

    def test_non_numeric_employee_id_is_403(self):
        self.login_as(self.it_staff)
        self.assertEqual(self.client.post(check_in("abc")).status_code, 403)

    def test_login_without_profile_is_403(self):
        self.login_as(self.plain_user)
        self.assertEqual(self.client.post(check_in(self.it_staff.id)).status_code, 403)

    def test_inactive_employee_is_403(self):
        gone = make_employee("gone@nda.test", department=self.it, is_active=False)
        self.login_as(gone)
        self.assertEqual(self.client.post(check_in(gone.id)).status_code, 403)

    def test_anonymous_is_401(self):
        self.assertEqual(self.client.post(check_in(self.it_staff.id)).status_code, 401)

    def test_get_is_not_allowed(self):
        self.login_as(self.it_staff)
        self.assertEqual(self.client.get(check_in(self.it_staff.id)).status_code, 405)


# ---------------------------------------------------------------------------
# check-out
# ---------------------------------------------------------------------------
class CheckOutTests(HRISTestCase):

    def check_in_at(self, moment, who=None):
        who = who or self.it_staff
        self.login_as(who)
        with freeze_time(moment):
            return self.client.post(check_in(who.id))

    def check_out_at(self, moment, who=None):
        who = who or self.it_staff
        self.login_as(who)
        with freeze_time(moment):
            return self.client.post(check_out(who.id))

    def test_full_day_is_present(self):
        self.check_in_at(at(9, 0))
        res = self.check_out_at(at(17, 30))
        self.assertEqual(res.status_code, 200, res.json())
        body = res.json()
        self.assertEqual(body["status"], "PRESENT")
        self.assertEqual(body["working_hours"], "08:30:00")
        self.assertEqual(body["formatted_working_hours"], "8h 30m")

    def test_short_day_is_early_departure(self):
        self.check_in_at(at(9, 0))
        res = self.check_out_at(at(13, 0))
        self.assertEqual(res.json()["status"], "EARLY_DEPARTURE")
        self.assertEqual(res.json()["formatted_working_hours"], "4h 0m")

    def test_late_arrival_stays_late_after_check_out(self):
        self.check_in_at(at(11, 30))
        res = self.check_out_at(at(20, 0))
        self.assertEqual(res.json()["status"], "LATE")

    def test_check_out_without_any_record_is_404(self):
        res = self.check_out_at(at(17, 0))
        self.assertEqual(res.status_code, 404)

    def test_check_out_without_check_in_is_400(self):
        make_attendance(self.it_staff, TODAY)  # row exists, but no check-in time
        res = self.check_out_at(at(17, 0))
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"], "You must check in before checking out.")

    def test_second_check_out_is_400(self):
        self.check_in_at(at(9, 0))
        self.check_out_at(at(17, 0))
        res = self.check_out_at(at(18, 0))
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"], "Already checked out today.")

    def test_yesterdays_check_in_does_not_count_today(self):
        self.check_in_at(kathmandu(2026, 10, 19, 9, 0))
        res = self.check_out_at(at(17, 0))   # it is now the 20th
        self.assertEqual(res.status_code, 404)

    def test_clock_going_backwards_returns_400_not_500(self):
        # check_out earlier than check_in -> Attendance.clean() error -> 400.
        self.check_in_at(at(10, 0))
        res = self.check_out_at(at(9, 0))
        self.assertEqual(res.status_code, 400)
        self.assertIn("check_out", res.json()["error"])

    def test_cannot_check_out_for_someone_else(self):
        self.check_in_at(at(9, 0), who=self.it_staff2)
        self.login_as(self.it_staff)
        with freeze_time(at(17, 0)):
            res = self.client.post(check_out(self.it_staff2.id))
        self.assertEqual(res.status_code, 403)
        self.assertIn("own account", res.json()["error"])
        self.assertIsNone(Attendance.objects.get(employee=self.it_staff2).check_out)

    def test_anonymous_is_401(self):
        self.assertEqual(self.client.post(check_out(self.it_staff.id)).status_code, 401)
