"""
Tests for the small function-based views in HRIS_APPS/views.py

    GET  /api/health/   api_health   -> always 200, no login needed
    GET  /api/csrf/     api_csrf     -> sets the csrftoken cookie
    GET  /api/me/       me           -> the logged-in employee's profile + is_hr
    _error_payload()                 -> turns a Django ValidationError into a dict
"""
from django.core.exceptions import ValidationError

from HRIS_APPS.views import _error_payload

from .base import HRISTestCase, make_employee


class HealthViewTests(HRISTestCase):

    def test_health_is_public_and_ok(self):
        # Used by the frontend / monitoring to see if Django is up. No login.
        res = self.client.get("/api/health/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "ok", "service": "hris-api"})


class CsrfViewTests(HRISTestCase):

    def test_csrf_sets_cookie(self):
        res = self.client.get("/api/csrf/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"detail": "CSRF cookie set"})
        self.assertIn("csrftoken", res.cookies)  # @ensure_csrf_cookie did its job


class MeViewTests(HRISTestCase):
    URL = "/api/me/"

    def test_requires_login(self):
        self.assertEqual(self.client.get(self.URL).status_code, 401)

    def test_hr_member_gets_profile_with_is_hr_true(self):
        # The frontend uses is_hr to open the Admin/HR workspace.
        self.login_as(self.hr_staff)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["id"], self.hr_staff.id)
        self.assertEqual(body["email"], "hr.staff@nda.test")
        self.assertEqual(body["department_name"], "HR")
        self.assertTrue(body["is_hr"])

    def test_other_employee_gets_is_hr_false(self):
        self.login_as(self.it_head)
        body = self.client.get(self.URL).json()
        self.assertEqual(body["id"], self.it_head.id)
        self.assertEqual(body["role"], "HEAD")
        self.assertFalse(body["is_hr"])

    def test_login_without_employee_profile_is_404(self):
        # e.g. a bare createsuperuser account (see CHANGES.md).
        self.login_as(self.plain_user)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, 404)
        self.assertIn("not linked to an employee profile", res.json()["detail"])

    def test_inactive_employee_is_403(self):
        emp = make_employee("left@nda.test", department=self.it, is_active=False)
        self.login_as(emp)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, 403)
        self.assertIn("inactive", res.json()["detail"])

    def test_only_get_is_allowed(self):
        self.login_as(self.it_staff)
        self.assertEqual(self.client.post(self.URL, {}).status_code, 405)


class ErrorPayloadTests(HRISTestCase):

    def test_field_errors_are_returned_as_dict(self):
        payload = _error_payload(ValidationError({"check_out": "Too early."}))
        self.assertEqual(payload, {"check_out": ["Too early."]})

    def test_plain_errors_go_under_non_field_errors(self):
        payload = _error_payload(ValidationError("Limit exceeded."))
        self.assertEqual(payload, {"non_field_errors": ["Limit exceeded."]})
