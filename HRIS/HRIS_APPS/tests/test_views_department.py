"""
Tests for DepartmentViewSet (HRIS_APPS/views.py)

    GET    /api/departments/        list      any logged-in user (for dropdowns)
    GET    /api/departments/<id>/   retrieve  any logged-in user
    POST   /api/departments/        create    HR Department Head only (IsHRHead)
    PUT    /api/departments/<id>/   update    HR Department Head only
    PATCH  /api/departments/<id>/   partial_update
    DELETE /api/departments/<id>/   destroy   HR Department Head only, and only
                                              if empty and not the HR department
"""
from HRIS_APPS.models import Department, Employee

from .base import HRISTestCase

LIST = "/api/departments/"


def detail(dept_id):
    return f"/api/departments/{dept_id}/"


class DepartmentReadTests(HRISTestCase):

    def test_anonymous_gets_401(self):
        self.assertEqual(self.client.get(LIST).status_code, 401)

    def test_every_logged_in_user_can_list(self):
        # get_permissions() swaps in IsAuthenticated for list/retrieve,
        # so even a login with no employee profile can load the dropdown.
        for who in (self.hr_head, self.it_staff, self.no_dept_staff, self.plain_user):
            with self.subTest(who=str(who)):
                self.login_as(who)
                self.assertEqual(self.client.get(LIST).status_code, 200)

    def test_list_is_sorted_by_name(self):
        self.login_as(self.it_staff)
        names = [d["name"] for d in self.client.get(LIST).json()]
        self.assertEqual(names, ["HR", "IT", "Sales"])

    def test_list_does_not_leak_member_emails(self):
        self.login_as(self.it_staff)
        it = next(d for d in self.client.get(LIST).json() if d["name"] == "IT")
        self.assertEqual(it["department_head_name"], "Ram Lead")
        for member in it["employees"]:
            self.assertNotIn("email", member)
            self.assertNotIn("phone", member)

    def test_retrieve(self):
        self.login_as(self.sales_staff)
        res = self.client.get(detail(self.it.id))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "IT")

    def test_retrieve_missing_is_404(self):
        self.login_as(self.sales_staff)
        self.assertEqual(self.client.get(detail(999999)).status_code, 404)


class DepartmentCreateTests(HRISTestCase):

    def test_hr_head_can_create(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, {"name": "  Finance ", "description": "Money"}, format="json")
        self.assertEqual(res.status_code, 201, res.json())
        self.assertEqual(res.json()["name"], "Finance")
        self.assertTrue(Department.objects.filter(name="Finance").exists())

    def test_create_with_a_head(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, {"name": "Ops", "department_head": self.it_head.id}, format="json")
        self.assertEqual(res.status_code, 201, res.json())
        self.assertEqual(res.json()["department_head_name"], "Ram Lead")

    def test_only_hr_head_can_create(self):
        for who in (self.hr_staff, self.it_head, self.it_staff, self.plain_user):
            with self.subTest(who=str(who)):
                self.login_as(who)
                res = self.client.post(LIST, {"name": "Finance"}, format="json")
                self.assertEqual(res.status_code, 403)
        self.assertFalse(Department.objects.filter(name="Finance").exists())

    def test_hr_staff_sees_the_reason(self):
        self.login_as(self.hr_staff)
        res = self.client.post(LIST, {"name": "Finance"}, format="json")
        self.assertIn("Only the HR Department Head", res.json()["detail"])

    def test_duplicate_name_rejected(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, {"name": "sales"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("name", res.json())

    def test_head_must_have_head_role(self):
        self.login_as(self.hr_head)
        res = self.client.post(LIST, {"name": "Ops", "department_head": self.it_staff.id}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("department_head", res.json())


class DepartmentUpdateTests(HRISTestCase):

    def test_hr_head_can_rename(self):
        self.login_as(self.hr_head)
        res = self.client.patch(detail(self.sales.id), {"name": "Sales & Marketing"}, format="json")
        self.assertEqual(res.status_code, 200, res.json())
        self.sales.refresh_from_db()
        self.assertEqual(self.sales.name, "Sales & Marketing")

    def test_put_full_update(self):
        self.login_as(self.hr_head)
        res = self.client.put(
            detail(self.sales.id),
            {"name": "Sales", "description": "Revenue", "department_head": self.it_head.id},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.json())
        self.sales.refresh_from_db()
        self.assertEqual(self.sales.department_head, self.it_head)

    def test_hr_department_cannot_lose_hr_in_name(self):
        self.login_as(self.hr_head)
        res = self.client.patch(detail(self.hr.id), {"name": "Admin"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("name", res.json())

    def test_hr_department_can_be_renamed_to_another_hr_name(self):
        self.login_as(self.hr_head)
        res = self.client.patch(detail(self.hr.id), {"name": "People Engagement & HR"}, format="json")
        self.assertEqual(res.status_code, 200, res.json())
        # The HR head is still recognised as HR after the rename.
        self.assertTrue(self.client.get("/api/me/").json()["is_hr"])

    def test_non_hr_head_cannot_update(self):
        self.login_as(self.hr_staff)
        res = self.client.patch(detail(self.sales.id), {"name": "X"}, format="json")
        self.assertEqual(res.status_code, 403)


class DepartmentDeleteTests(HRISTestCase):

    def test_empty_department_is_deleted(self):
        empty = Department.objects.create(name="Temp")
        self.login_as(self.hr_head)
        self.assertEqual(self.client.delete(detail(empty.id)).status_code, 204)
        self.assertFalse(Department.objects.filter(id=empty.id).exists())

    def test_department_with_employees_is_protected(self):
        # Deleting would CASCADE-delete every employee, so it is refused.
        self.login_as(self.hr_head)
        res = self.client.delete(detail(self.it.id))
        self.assertEqual(res.status_code, 400)
        self.assertIn("Move or remove", res.json()["error"])
        self.assertTrue(Employee.objects.filter(id=self.it_staff.id).exists())

    def test_empty_hr_department_still_cannot_be_deleted(self):
        # A second, empty HR-like department: no employees, but still HR.
        hr2 = Department.objects.create(name="Human Resources")
        self.login_as(self.hr_head)
        res = self.client.delete(detail(hr2.id))
        self.assertEqual(res.status_code, 400)
        self.assertIn("HR department cannot be deleted", res.json()["error"])

    def test_only_hr_head_can_delete(self):
        empty = Department.objects.create(name="Temp")
        self.login_as(self.hr_staff)
        self.assertEqual(self.client.delete(detail(empty.id)).status_code, 403)
        self.assertTrue(Department.objects.filter(id=empty.id).exists())

    def test_delete_missing_is_404(self):
        self.login_as(self.hr_head)
        self.assertEqual(self.client.delete(detail(999999)).status_code, 404)
