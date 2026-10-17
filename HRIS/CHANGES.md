# HRIS fixes

## After pulling these changes

```bash
python manage.py migrate        # applies 0002_attendance_date_default
python manage.py runserver      # port 8000
cd hris-frontend && npm run dev # port 5173
```

**Every login must be linked to an Employee row.** `createsuperuser` alone is not enough:
`/api/me/` returns 404 and the login page says "This login is not linked to an employee profile".
To bootstrap the first admin, go to `/django-admin/`:
1. Create a Department named exactly **HR**.
2. Create an Employee with role **Department Head**, department **HR**, and **User** set to your superuser.

Anyone in the HR department (Head or Staff) gets the Admin/HR workspace. Everyone else gets the Employee workspace.

## Backend

| File | Problem | Fix |
|---|---|---|
| `HRIS_APPS/serializers.py` | `CharField(source="formatted_working_hours")` has the same name as the field, so DRF raises an AssertionError and **every attendance response was a 500** | Removed the redundant `source` |
| `HRIS/settings.py` | `CorsMiddleware` was last in the list | Moved it to the top |
| `HRIS/settings.py` | SessionAuthentication ran before JWT, so a django-admin cookie on localhost made React POSTs fail with "CSRF Failed" | JWT first |
| `HRIS/settings.py` | JWT access token expired after 5 min (default) | 1 h access, 7 d refresh, and the frontend now refreshes automatically |
| `HRIS/settings.py` | `TIME_ZONE='UTC'`, so "today" and the 11:00 late rule were 5h45m off | `Asia/Kathmandu` |
| `models.py` + `0002` migration | `Attendance.date` used `auto_now_add`, so `self.date` was `None` inside `save()` for new rows and the leave lookup crashed | `default=timezone.localdate` |
| `models.py` | Late check compared UTC time | Uses `timezone.localtime()` |
| `views.py` `LeaveViewSet` | Any logged-in user could list, edit or delete **every** leave and file leave for other people | Queryset scoped (HR: all, Head: their dept, Staff: own). `employee` is taken from the logged-in user. PUT/PATCH removed. DELETE only cancels your own PENDING leave |
| `views.py` `review` | Limit errors from `Leave.save()` came back as 500. An already-reviewed leave could be re-reviewed | Returns 400 for both |
| `serializers.py` `LeaveSerializer` | Same 500 issue on create. An employee with no department crashed | Converted to 400 with a clear message. Added `created_at` |
| `views.py` `AttendanceViewSet` | Any employee could POST attendance for anyone | Read-only. Records only come from check-in/out |
| `serializers.py` `EmployeeSerializer.update` | Password was silently ignored. Email/name/active changes never reached the login User | Synced |
| `views.py` | No way for the frontend to know who is logged in | New `GET /api/me/` |
| `views.py` `EmployeeViewSet` | Deleting an employee left an orphan login | Deletes the User too |
| `views.py` `DepartmentViewSet` | Non-HR users couldn't load departments for dropdowns | Anyone logged in can read. Nested data trimmed so it doesn't leak emails |

## Frontend

The main problem: **only login talked to Django.** Every page read `mockData.js` and the hard-coded `CURRENT_EMP_ID = 'EMP-1042'`. Check-in, leave, approvals and employee edits only changed in-memory state that disappeared on refresh.

- `context/AppContext.jsx`: loads employees, departments, attendance and leaves from the API. Exposes `actions.checkIn/checkOut/submitLeave/cancelLeave/reviewLeave/createEmployee/updateEmployee`. Restores the session on refresh. Leave balance and notifications are now computed from real leaves.
- `lib/api.js`: `/me`, cancel leave, multipart leave upload, automatic token refresh on 401, readable DRF errors. Normalizers turn ids into strings, which fixes `e.id.toLowerCase()` crashes and route-param comparisons.
- `LoginPage.jsx`: the role comes from `/api/me/` (`is_hr`) instead of guessing from whether `/employees/` returns 403.
- All pages: `CURRENT_EMP_ID` replaced with `state.currentEmpId`. Dispatches replaced with API calls and error toasts. Dates use the local day instead of UTC `toISOString()`.
- Employee modals rebuilt around the real fields (first/last name, role, department id, hire date, password). The old form posted `name/dept/position`, which the backend doesn't have.
- Leave types now match the Django choices (`OTHERS`, not `other`). Balances use the real limits (Annual 10, Sick 15, Casual 6, Festive 6 per 6 months) instead of the made-up 18/10/8/4.
- `vite.config.js`: proxies `/media` so leave attachments open.
- `AppShell` dispatched `SET_MOBILE_NAV`, which didn't exist. It's added now.

## Still static (no backend for these yet)
Reports page charts and exports, Settings page, and the audit log.
