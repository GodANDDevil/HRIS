"""
Tests for LeaveViewSet (HRIS_APPS/views.py)

    GET    /api/leaves/               list      scoped by get_queryset()
    GET    /api/leaves/<id>/          retrieve  scoped by get_queryset()
    POST   /api/leaves/               create    perform_create(): employee = logged-in user
    DELETE /api/leaves/<id>/          destroy   cancel your OWN PENDING leave
    POST   /api/leaves/<id>/review/   review    HR approves / rejects (action)
    PUT / PATCH                       removed -> 405

Who sees what (get_queryset):
    HR head / HR staff  -> every leave
    other dept head     -> leaves of their own department
    staff               -> only their own
    no profile/inactive -> nothing
"""
import shutil
import tempfile
from datetime import date

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from HRIS_APPS.models import Leave

from .base import HRISTestCase, make_employee, make_leave

LIST = "/api/leaves/"


def detail(pk):
    return f"/api/leaves/{pk}/"


def review(pk):
    return f"/api/leaves/{pk}/review/"


NEW_LEAVE = {
    "leave_type": "SICK",
    "start_date": "2026-11-10",
    "end_date": "2026-11-12",
    "reason": "Flu",
}


class LeaveTestCase(HRISTestCase):
    """Adds one pending leave for four different people."""

    def setUp(self):
        self.it_leave = make_leave(self.it_staff, date(2026, 11, 2), days=2)
        self.it2_leave = make_leave(self.it_staff2, date(2026, 11, 3), days=1)
        self.sales_leave = make_leave(self.sales_staff, date(2026, 11, 4), days=1)
        self.hr_leave = make_leave(self.hr_staff, date(2026, 11, 5), days=1)
        self.all_ids = {self.it_leave.id, self.it2_leave.id, self.sales_leave.id, self.hr_leave.id}


# ---------------------------------------------------------------------------
# list / retrieve
# ---------------------------------------------------------------------------
class LeaveListTests(LeaveTestCase):

    def test_anonymous_gets_401(self):
        self.assertEqual(self.client.get(LIST).status_code, 401)

    def test_hr_head_and_hr_staff_see_all(self):
        for who in (self.hr_head, self.hr_staff):
            with self.subTest(who=str(who)):
                self.login_as(who)
                self.assertEqual(self.ids(self.client.get(LIST)), self.all_ids)

    def test_department_head_sees_own_department(self):
        self.login_as(self.it_head)
        self.assertEqual(self.ids(self.client.get(LIST)), {self.it_leave.id, self.it2_leave.id})

    def test_staff_sees_only_own(self):
        self.login_as(self.it_staff)
        self.assertEqual(self.ids(self.client.get(LIST)), {self.it_leave.id})

    def test_user_without_profile_sees_nothing(self):
        self.login_as(self.plain_user)
        res = self.client.get(LIST)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_inactive_employee_sees_nothing(self):
        gone = make_employee("gone@nda.test", role="HEAD", department=self.hr, is_active=False)
        self.login_as(gone)
        self.assertEqual(self.client.get(LIST).json(), [])

    def test_newest_request_first(self):
        # Give the rows clearly different created_at values, then check order.
        from datetime import datetime, timezone as tz
        for i, leave in enumerate([self.it_leave, self.it2_leave, self.sales_leave, self.hr_leave]):
            Leave.objects.filter(pk=leave.pk).update(created_at=datetime(2026, 10, 1 + i, tzinfo=tz.utc))
        self.login_as(self.hr_head)
        ids = [row["id"] for row in self.client.get(LIST).json()]
        self.assertEqual(ids, [self.hr_leave.id, self.sales_leave.id, self.it2_leave.id, self.it_leave.id])

    def test_row_shape(self):
        self.login_as(self.it_staff)
        row = self.client.get(LIST).json()[0]
        for key in ("id", "employee", "employee_name", "department_id", "department_name",
                    "designation", "leave_type", "start_date", "end_date", "total_days",
                    "reason", "document", "status", "created_at"):
            self.assertIn(key, row)
        self.assertEqual(row["total_days"], 2)


class LeaveRetrieveTests(LeaveTestCase):

    def test_staff_can_open_own(self):
        self.login_as(self.it_staff)
        self.assertEqual(self.client.get(detail(self.it_leave.id)).status_code, 200)

    def test_staff_cannot_open_others(self):
        # Outside the queryset -> 404 (does not even reveal that it exists).
        self.login_as(self.it_staff)
        self.assertEqual(self.client.get(detail(self.it2_leave.id)).status_code, 404)

    def test_department_head_cannot_open_other_department(self):
        self.login_as(self.it_head)
        self.assertEqual(self.client.get(detail(self.it2_leave.id)).status_code, 200)
        self.assertEqual(self.client.get(detail(self.sales_leave.id)).status_code, 404)

    def test_hr_can_open_any(self):
        self.login_as(self.hr_staff)
        self.assertEqual(self.client.get(detail(self.sales_leave.id)).status_code, 200)


# ---------------------------------------------------------------------------
# create (apply for leave)
# ---------------------------------------------------------------------------
class LeaveCreateTests(LeaveTestCase):

    def test_apply_for_leave(self):
        self.login_as(self.it_staff)
        res = self.client.post(LIST, NEW_LEAVE, format="json")
        self.assertEqual(res.status_code, 201, res.json())
        body = res.json()
        self.assertEqual(body["employee"], self.it_staff.id)   # taken from the login
        self.assertEqual(body["status"], "PENDING")
        self.assertEqual(body["total_days"], 3)
        self.assertEqual(body["department_name"], "IT")
        self.assertEqual(body["designation"], "STAFF")

    def test_cannot_apply_for_someone_else_or_self_approve(self):
        self.login_as(self.it_staff)
        res = self.client.post(
            LIST, dict(NEW_LEAVE, employee=self.sales_staff.id, status="APPROVED"), format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["employee"], self.it_staff.id)
        self.assertEqual(res.json()["status"], "PENDING")

    def test_hr_members_can_apply_too(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, NEW_LEAVE, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["designation"], "HEAD")

    def test_upload_document(self):
        media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, media, ignore_errors=True)
        with override_settings(MEDIA_ROOT=media):
            self.login_as(self.it_staff)
            doc = SimpleUploadedFile("note.pdf", b"%PDF-1.4 test", content_type="application/pdf")
            res = self.client.post(LIST, dict(NEW_LEAVE, document=doc), format="multipart")
        self.assertEqual(res.status_code, 201, res.json())
        self.assertIn("leave_documents/", res.json()["document"])

    def test_end_before_start_is_400(self):
        self.login_as(self.it_staff)
        res = self.client.post(LIST, dict(NEW_LEAVE, end_date="2026-11-01"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("end_date", res.json())

    def test_over_the_limit_is_400_not_500(self):
        self.login_as(self.it_staff)
        res = self.client.post(
            LIST, dict(NEW_LEAVE, leave_type="CASUAL", start_date="2026-11-20", end_date="2026-11-24"),
            format="json",
        )
        # it_staff already has 2 casual days pending (setUp) -> 2 + 5 = 7 > 6
        self.assertEqual(res.status_code, 400)
        self.assertIn("limit exceeded", str(res.json()))

    def test_employee_without_department_gets_400(self):
        self.login_as(self.no_dept_staff)
        res = self.client.post(LIST, NEW_LEAVE, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("employee", res.json())

    def test_inactive_employee_gets_403(self):
        gone = make_employee("gone@nda.test", department=self.it, is_active=False)
        self.login_as(gone)
        self.assertEqual(self.client.post(LIST, NEW_LEAVE, format="json").status_code, 403)

    def test_login_without_profile_gets_403(self):
        self.login_as(self.plain_user)
        self.assertEqual(self.client.post(LIST, NEW_LEAVE, format="json").status_code, 403)

    def test_missing_fields(self):
        self.login_as(self.it_staff)
        res = self.client.post(LIST, {}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("start_date", res.json())
        self.assertIn("end_date", res.json())

    def test_invalid_leave_type(self):
        self.login_as(self.it_staff)
        res = self.client.post(LIST, dict(NEW_LEAVE, leave_type="VACATION"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("leave_type", res.json())

    def test_anonymous_gets_401(self):
        self.assertEqual(self.client.post(LIST, NEW_LEAVE, format="json").status_code, 401)


# ---------------------------------------------------------------------------
# editing is disabled
# ---------------------------------------------------------------------------
class LeaveEditDisabledTests(LeaveTestCase):

    def test_put_and_patch_are_not_allowed(self):
        # UpdateModelMixin is not included, so nobody (not even HR) can edit a leave.
        for who in (self.it_staff, self.hr_head):
            with self.subTest(who=str(who)):
                self.login_as(who)
                self.assertEqual(self.client.patch(detail(self.it_leave.id), {"reason": "x"}, format="json").status_code, 405)
                self.assertEqual(self.client.put(detail(self.it_leave.id), NEW_LEAVE, format="json").status_code, 405)


# ---------------------------------------------------------------------------
# destroy (cancel)
# ---------------------------------------------------------------------------
class LeaveCancelTests(LeaveTestCase):

    def test_cancel_own_pending(self):
        self.login_as(self.it_staff)
        self.assertEqual(self.client.delete(detail(self.it_leave.id)).status_code, 204)
        self.assertFalse(Leave.objects.filter(pk=self.it_leave.pk).exists())

    def test_cannot_cancel_after_review(self):
        for status in ("APPROVED", "REJECTED"):
            with self.subTest(status=status):
                Leave.objects.filter(pk=self.it_leave.pk).update(status=status)
                self.login_as(self.it_staff)
                res = self.client.delete(detail(self.it_leave.id))
                self.assertEqual(res.status_code, 400)
                self.assertIn("Only pending", res.json()["error"])

    def test_hr_cannot_cancel_someone_elses(self):
        # HR can SEE the leave, but cancelling is only for its owner.
        self.login_as(self.hr_head)
        res = self.client.delete(detail(self.it_leave.id))
        self.assertEqual(res.status_code, 403)
        self.assertTrue(Leave.objects.filter(pk=self.it_leave.pk).exists())

    def test_staff_cannot_cancel_invisible_leave(self):
        self.login_as(self.it_staff)
        self.assertEqual(self.client.delete(detail(self.sales_leave.id)).status_code, 404)


# ---------------------------------------------------------------------------
# review (approve / reject)
# ---------------------------------------------------------------------------
class LeaveReviewTests(LeaveTestCase):

    def test_hr_head_approves(self):
        self.login_as(self.hr_head)
        res = self.client.post(review(self.it_leave.id), {"status": "APPROVED"}, format="json")
        self.assertEqual(res.status_code, 200, res.json())
        self.assertEqual(res.json()["status"], "APPROVED")
        self.assertEqual(Leave.objects.get(pk=self.it_leave.pk).status, "APPROVED")

    def test_hr_staff_rejects(self):
        self.login_as(self.hr_staff)
        res = self.client.post(review(self.sales_leave.id), {"status": "REJECTED"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Leave.objects.get(pk=self.sales_leave.pk).status, "REJECTED")

    def test_non_hr_cannot_review(self):
        for who in (self.it_head, self.it_staff, self.plain_user):
            with self.subTest(who=str(who)):
                self.login_as(who)
                res = self.client.post(review(self.it_leave.id), {"status": "APPROVED"}, format="json")
                self.assertEqual(res.status_code, 403)
        self.assertEqual(Leave.objects.get(pk=self.it_leave.pk).status, "PENDING")

    def test_anonymous_gets_401(self):
        res = self.client.post(review(self.it_leave.id), {"status": "APPROVED"}, format="json")
        self.assertEqual(res.status_code, 401)

    def test_invalid_or_missing_status(self):
        self.login_as(self.hr_head)
        for payload in ({"status": "PENDING"}, {"status": "approved"}, {"status": "MAYBE"}, {}):
            with self.subTest(payload=payload):
                res = self.client.post(review(self.it_leave.id), payload, format="json")
                self.assertEqual(res.status_code, 400)
                self.assertEqual(res.json()["error"], "Invalid status")

    def test_cannot_review_twice(self):
        self.login_as(self.hr_head)
        self.client.post(review(self.it_leave.id), {"status": "APPROVED"}, format="json")
        res = self.client.post(review(self.it_leave.id), {"status": "REJECTED"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("already approved", res.json()["error"])
        self.assertEqual(Leave.objects.get(pk=self.it_leave.pk).status, "APPROVED")

    def test_hr_cannot_review_own_leave(self):
        # hr_staff applied in setUp; they must not approve it themselves.
        self.login_as(self.hr_staff)
        res = self.client.post(review(self.hr_leave.id), {"status": "APPROVED"}, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertIn("cannot review your own", res.json()["error"])

    def test_another_hr_member_can_review_hr_leave(self):
        self.login_as(self.hr_head)
        res = self.client.post(review(self.hr_leave.id), {"status": "APPROVED"}, format="json")
        self.assertEqual(res.status_code, 200)

    def test_missing_leave_is_404(self):
        self.login_as(self.hr_head)
        self.assertEqual(self.client.post(review(999999), {"status": "APPROVED"}, format="json").status_code, 404)

    def test_only_post_is_allowed(self):
        self.login_as(self.hr_head)
        self.assertEqual(self.client.get(review(self.it_leave.id)).status_code, 405)

    def test_limit_error_during_review_is_400_not_500(self):
        # Make the data inconsistent on purpose: bump the other pending leave's
        # stored total_days behind the model's back (queryset.update skips save()).
        # Approving it_leave then fails Leave.clean(): 5 + 2 > 6 casual days.
        other = make_leave(self.it_staff, date(2026, 11, 10), days=4)
        Leave.objects.filter(pk=other.pk).update(total_days=5, start_date=date(2026, 11, 1),
                                                 end_date=date(2026, 11, 1))
        self.login_as(self.hr_head)
        res = self.client.post(review(self.it_leave.id), {"status": "APPROVED"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("limit exceeded", str(res.json()["error"]))
        self.assertEqual(Leave.objects.get(pk=self.it_leave.pk).status, "PENDING")
