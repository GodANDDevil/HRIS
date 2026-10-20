"""
Tests for HRIS/urls.py, the JWT login flow and HRIS_APPS/admin.py

    POST /api/auth/token/          EmailOrUsernameTokenView -> access + refresh
    POST /api/auth/token/refresh/  TokenRefreshView         -> new access token
    "Authorization: Bearer <token>" works on protected endpoints
    GET  /api/                     DRF router root (lists the 4 resources)
    GET  /django-admin/            Django admin is mounted
    URL names reverse to the paths the frontend calls
    All four models are registered in the admin
"""
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.urls import reverse

from HRIS_APPS.models import Attendance, Department, Employee, Leave

from .base import PASSWORD, HRISTestCase

User = get_user_model()

TOKEN = "/api/auth/token/"
REFRESH = "/api/auth/token/refresh/"


class LoginTests(HRISTestCase):

    def login(self, username, password=PASSWORD):
        return self.client.post(TOKEN, {"username": username, "password": password}, format="json")

    def test_login_with_email_returns_tokens(self):
        res = self.login("it.staff@nda.test")
        self.assertEqual(res.status_code, 200, res.json())
        self.assertIn("access", res.json())
        self.assertIn("refresh", res.json())

    def test_login_with_email_in_any_case(self):
        self.assertEqual(self.login("IT.Staff@NDA.test").status_code, 200)

    def test_login_with_username(self):
        self.assertEqual(self.login("plain").status_code, 200)

    def test_wrong_password_is_401(self):
        self.assertEqual(self.login("it.staff@nda.test", "wrong").status_code, 401)

    def test_unknown_user_is_401(self):
        self.assertEqual(self.login("ghost@nda.test").status_code, 401)

    def test_disabled_login_is_401(self):
        User.objects.filter(pk=self.it_staff.user.pk).update(is_active=False)
        self.assertEqual(self.login("it.staff@nda.test").status_code, 401)

    def test_missing_fields_is_400(self):
        res = self.client.post(TOKEN, {}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("username", res.json())
        self.assertIn("password", res.json())

    def test_access_token_works_on_protected_endpoint(self):
        # Full real flow, no force_authenticate: login -> Bearer header -> /api/me/.
        access = self.login("hr.head@nda.test").json()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        res = self.client.get("/api/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["id"], self.hr_head.id)
        self.assertTrue(res.json()["is_hr"])

    def test_garbage_token_is_401(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
        self.assertEqual(self.client.get("/api/me/").status_code, 401)

    def test_refresh_returns_new_access_token(self):
        refresh = self.login("it.staff@nda.test").json()["refresh"]
        res = self.client.post(REFRESH, {"refresh": refresh}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.json())

    def test_bad_refresh_token_is_401(self):
        res = self.client.post(REFRESH, {"refresh": "nope"}, format="json")
        self.assertEqual(res.status_code, 401)


class UrlTests(HRISTestCase):

    def test_named_urls_match_frontend_paths(self):
        # These are the exact paths hris-frontend/src/lib/api.js calls.
        self.assertEqual(reverse("api_health"), "/api/health/")
        self.assertEqual(reverse("api_csrf"), "/api/csrf/")
        self.assertEqual(reverse("api_me"), "/api/me/")
        self.assertEqual(reverse("token_obtain_pair"), "/api/auth/token/")
        self.assertEqual(reverse("token_refresh"), "/api/auth/token/refresh/")
        self.assertEqual(reverse("employee-list"), "/api/employees/")
        self.assertEqual(reverse("employee-detail", args=[1]), "/api/employees/1/")
        self.assertEqual(reverse("department-list"), "/api/departments/")
        self.assertEqual(reverse("leave-list"), "/api/leaves/")
        self.assertEqual(reverse("leave-review", args=[1]), "/api/leaves/1/review/")
        self.assertEqual(reverse("attendance-list"), "/api/attendance/")
        self.assertEqual(
            reverse("attendance-check-in", kwargs={"employee_id": 7}), "/api/attendance/check-in/7/",
        )
        self.assertEqual(
            reverse("attendance-check-out", kwargs={"employee_id": 7}), "/api/attendance/check-out/7/",
        )

    def test_api_root_lists_resources(self):
        self.login_as(self.it_staff)
        res = self.client.get("/api/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(set(res.json()), {"employees", "departments", "leaves", "attendance"})

    def test_api_root_needs_login(self):
        self.assertEqual(self.client.get("/api/").status_code, 401)

    def test_django_admin_is_mounted(self):
        res = self.client.get("/django-admin/")
        self.assertEqual(res.status_code, 302)          # redirect to admin login
        self.assertIn("/django-admin/login/", res["Location"])


class AdminRegistrationTests(HRISTestCase):

    def test_all_models_registered(self):
        for model in (Employee, Department, Leave, Attendance):
            with self.subTest(model=model.__name__):
                self.assertTrue(admin.site.is_registered(model))
