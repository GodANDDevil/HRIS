"""
HRIS test suite.

Run everything:
    python manage.py test HRIS_APPS --settings=HRIS.settings_test

Run one file / one class / one test:
    python manage.py test HRIS_APPS.tests.test_models --settings=HRIS.settings_test
    python manage.py test HRIS_APPS.tests.test_views_leave.LeaveReviewTests --settings=HRIS.settings_test

File map (one file per source file it covers):
    base.py                  shared test data + helpers (no tests in it)
    test_models.py           models.py        Employee / Department / Leave / Attendance
    test_permissions.py      permission.py    helper functions + 4 permission classes
    test_serializers.py      serializers.py + auth_serializers.py
    test_views_misc.py       views.py         api_health, api_csrf, me, _error_payload
    test_views_employee.py   views.py         EmployeeViewSet (list/retrieve/create/update/delete)
    test_views_department.py views.py         DepartmentViewSet (list/retrieve/create/update/delete)
    test_views_leave.py      views.py         LeaveViewSet (list/retrieve/create/cancel/review)
    test_views_attendance.py views.py         AttendanceViewSet (list/retrieve/check-in/check-out)
    test_auth_and_urls.py    HRIS/urls.py     JWT login (email or username), refresh, admin site
"""
