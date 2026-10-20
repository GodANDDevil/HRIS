"""
Tests for EmployeeViewSet (HRIS_APPS/views.py)

    GET    /api/employees/        list      HR only
    GET    /api/employees/<id>/   retrieve  HR only
    POST   /api/employees/        create    HR only (creates the login too)
    PUT    /api/employees/<id>/   update    HR only
    PATCH  /api/employees/<id>/   partial_update
    DELETE /api/employees/<id>/   destroy   (perform_destroy also deletes the login)

"HR only" = IsAdminOrHR: active HR Department Head or HR Department Staff.
"""
from django.contrib.auth import get_user_model

from HRIS_APPS.models import Employee

from .base import HRISTestCase, make_employee

User = get_user_model()

LIST = "/api/employees/"


def detail(emp_id):
    return f"/api/employees/{emp_id}/"


def body(**overrides):
    data = {
        "first_name": "Anita",
        "last_name": "Shrestha",
        "email": "anita@nda.test",
        "phone": "9811111111",
        "role": "STAFF",
        "hire_date": "2026-10-01",
        "is_active": True,
        "password": "welcome-anita",
    }
    data.update(overrides)
    return data


class EmployeeAccessTests(HRISTestCase):
    """Who can reach the employee endpoints at all."""

    def test_list_access_by_role(self):
        inactive_hr = make_employee("old.hr@nda.test", role="HEAD", department=self.hr, is_active=False)
        cases = [
            ("HR head", self.hr_head, 200),
            ("HR staff", self.hr_staff, 200),
            ("IT head", self.it_head, 403),
            ("IT staff", self.it_staff, 403),
            ("login w/o employee", self.plain_user, 403),
            ("inactive HR head", inactive_hr, 403),
        ]
        for label, who, expected in cases:
            with self.subTest(who=label):
                self.login_as(who)
                self.assertEqual(self.client.get(LIST).status_code, expected)

    def test_anonymous_gets_401(self):
        self.assertEqual(self.client.get(LIST).status_code, 401)

    def test_non_hr_cannot_create_update_or_delete(self):
        self.login_as(self.it_head)
        self.assertEqual(self.client.post(LIST, body(), format="json").status_code, 403)
        self.assertEqual(self.client.patch(detail(self.it_staff.id), {"phone": "1"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(detail(self.it_staff.id)).status_code, 403)
        self.assertFalse(Employee.objects.filter(email="anita@nda.test").exists())
        self.assertTrue(Employee.objects.filter(id=self.it_staff.id).exists())


class EmployeeListRetrieveTests(HRISTestCase):

    def setUp(self):
        self.login_as(self.hr_staff)

    def test_list_returns_everyone_ordered_by_id(self):
        res = self.client.get(LIST)
        ids = [row["id"] for row in res.json()]
        self.assertEqual(ids, sorted(Employee.objects.values_list("id", flat=True)))

    def test_list_rows_have_department_name_and_no_password(self):
        row = next(r for r in self.client.get(LIST).json() if r["id"] == self.it_staff.id)
        self.assertEqual(row["department_name"], "IT")
        self.assertNotIn("password", row)

    def test_retrieve_one(self):
        res = self.client.get(detail(self.sales_staff.id))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["email"], "sales@nda.test")

    def test_retrieve_missing_is_404(self):
        self.assertEqual(self.client.get(detail(999999)).status_code, 404)


class EmployeeCreateTests(HRISTestCase):

    def test_hr_head_creates_staff_with_login(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, body(department=self.it.id), format="json")
        self.assertEqual(res.status_code, 201, res.json())
        self.assertEqual(res.json()["department_name"], "IT")
        self.assertNotIn("password", res.json())

        emp = Employee.objects.get(email="anita@nda.test")
        self.assertEqual(emp.user.username, "anita@nda.test")
        self.assertTrue(emp.user.check_password("welcome-anita"))

    def test_new_employee_can_log_in_with_jwt(self):
        # End-to-end: the account HR creates really works on the login endpoint.
        self.login_as(self.hr_head)
        self.client.post(LIST, body(department=self.it.id), format="json")
        self.logout()
        res = self.client.post("/api/auth/token/", {"username": "anita@nda.test", "password": "welcome-anita"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.json())

    def test_hr_staff_can_create_staff(self):
        self.login_as(self.hr_staff)
        res = self.client.post(LIST, body(department=self.sales.id), format="json")
        self.assertEqual(res.status_code, 201, res.json())

    def test_hr_staff_cannot_create_hr_head(self):
        self.login_as(self.hr_staff)
        res = self.client.post(LIST, body(role="HEAD", department=self.hr.id), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("department", res.json())

    def test_hr_head_can_create_hr_head(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, body(role="HEAD", department=self.hr.id), format="json")
        self.assertEqual(res.status_code, 201, res.json())

    def test_email_is_normalised(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, body(email="  ANITA@NDA.test "), format="json")
        self.assertEqual(res.status_code, 201, res.json())
        self.assertEqual(res.json()["email"], "anita@nda.test")

    def test_password_required_on_create(self):
        self.login_as(self.hr_head)
        data = body()
        data.pop("password")
        res = self.client.post(LIST, data, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("password", res.json())
        self.assertFalse(User.objects.filter(username="anita@nda.test").exists())

    def test_short_password_rejected(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, body(password="1234567"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("password", res.json())

    def test_duplicate_email_rejected(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, body(email="IT.Staff@nda.test"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.json())

    def test_existing_login_with_same_email_rejected(self):
        User.objects.create_user(username="anita@nda.test", password="whatever1")
        self.login_as(self.hr_head)
        res = self.client.post(LIST, body(), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.json())
        self.assertFalse(Employee.objects.filter(email="anita@nda.test").exists())

    def test_invalid_role_rejected(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, body(role="CEO"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("role", res.json())

    def test_required_fields(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, {}, format="json")
        self.assertEqual(res.status_code, 400)
        for field in ("first_name", "last_name", "email", "hire_date"):
            self.assertIn(field, res.json())


class EmployeeUpdateTests(HRISTestCase):

    def setUp(self):
        self.login_as(self.hr_head)

    def test_patch_one_field(self):
        res = self.client.patch(detail(self.it_staff.id), {"phone": "9800000001"}, format="json")
        self.assertEqual(res.status_code, 200, res.json())
        self.assertEqual(Employee.objects.get(id=self.it_staff.id).phone, "9800000001")

    def test_put_full_update(self):
        res = self.client.put(
            detail(self.it_staff.id),
            body(email="gita@nda.test", first_name="Gita", last_name="Sharma",
                 department=self.sales.id, password="new-password-1"),
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.json())
        emp = Employee.objects.get(id=self.it_staff.id)
        self.assertEqual(emp.department, self.sales)
        self.assertEqual(emp.last_name, "Sharma")

    def test_patch_password_changes_login_password(self):
        self.client.patch(detail(self.it_staff.id), {"password": "rotated-pass-9"}, format="json")
        user = User.objects.get(pk=self.it_staff.user.pk)
        self.assertTrue(user.check_password("rotated-pass-9"))

    def test_patch_email_moves_login_username(self):
        self.client.patch(detail(self.it_staff.id), {"email": "gita.dev@nda.test"}, format="json")
        user = User.objects.get(pk=self.it_staff.user.pk)
        self.assertEqual(user.username, "gita.dev@nda.test")

    def test_deactivating_employee_blocks_them(self):
        self.client.patch(detail(self.it_staff.id), {"is_active": False}, format="json")
        user = User.objects.get(pk=self.it_staff.user.pk)
        self.assertFalse(user.is_active)        # can't get a new JWT any more
        self.login_as(self.it_staff)
        self.assertEqual(self.client.get("/api/me/").status_code, 403)

    def test_hr_staff_cannot_edit_hr_head_current_behaviour(self):
        # NOTE: EmployeeSerializer.validate() runs on updates too. For an
        # existing HR head, role=HEAD and department=HR come from the instance,
        # so HR *staff* get a 400 even for a harmless phone change.
        # If that is not intended, limit the rule to create / role changes
        # and flip this assertion to 200.
        self.login_as(self.hr_staff)
        res = self.client.patch(detail(self.hr_head.id), {"phone": "1"}, format="json")
        self.assertEqual(res.status_code, 400)


class EmployeeDeleteTests(HRISTestCase):

    def setUp(self):
        self.login_as(self.hr_head)

    def test_delete_removes_employee_and_login(self):
        user_pk = self.sales_staff.user.pk
        res = self.client.delete(detail(self.sales_staff.id))
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Employee.objects.filter(id=self.sales_staff.id).exists())
        self.assertFalse(User.objects.filter(pk=user_pk).exists())  # no orphan login

    def test_delete_employee_without_login(self):
        emp = make_employee("nologin@nda.test", department=self.it, with_login=False)
        self.assertEqual(self.client.delete(detail(emp.id)).status_code, 204)
        self.assertFalse(Employee.objects.filter(id=emp.id).exists())

    def test_delete_missing_is_404(self):
        self.assertEqual(self.client.delete(detail(999999)).status_code, 404)
