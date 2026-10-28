# HRIS — Human Resource Information System

A web-based HR system for managing employees, departments, daily attendance and leave.
Django REST Framework provides the API; a React + Tailwind CSS single-page app provides the UI.

- **Backend:** Django 6.1, Django REST Framework, SimpleJWT, PostgreSQL (psycopg 3)
- **Frontend:** React 19, React Router 7, Vite 8, Tailwind CSS 3
- **Time zone:** `Asia/Kathmandu` (used for "today", late check-ins and leave dates)

---

## Features

**Admin / HR workspace** (`/admin`)
- Dashboard with headcount, today's attendance and pending leave
- Employees: add, edit, deactivate, delete (the linked login is updated and removed with the employee)
- Departments: create and manage, with an optional department head
- Attendance overview for all employees
- Leave requests: approve or reject (nobody can review their own request)
- Leave balances per employee and notifications

**Employee workspace** (`/employee`)
- One-click check-in and check-out
- Attendance history
- Apply for leave with an optional supporting document; cancel a pending request
- Leave balance, notifications and profile

**Still static (no backend yet):** the Reports page charts and exports, the Settings page and the audit log.

---

## Roles and access

The workspace a user sees depends on their **Employee** record, not on Django's superuser flag.

| Who | Workspace | Leave visible | Attendance visible |
|---|---|---|---|
| Anyone in an HR department (Head or Staff) | Admin / HR | All | All |
| Department Head (other departments) | Employee | Their department | Their department |
| Staff | Employee | Their own | Their own |

A department counts as HR if its name contains "HR" or "Human Resources" as a whole word
(for example `HR`, `HR & Admin`, `Human Resources`).

Other rules:
- Only the **HR Department Head** can create, edit or delete departments. Every logged-in user can read the department list.
- The HR department cannot be deleted, and a department that still has employees cannot be deleted.
- Attendance records are created **only** through check-in and check-out, and only for your own account.
- **Every login must be linked to an Employee.** A login without one gets "This login is not linked to an employee profile."

---

## Business rules

### Attendance
One record per employee per day. The status is set automatically:

| Status | When |
|---|---|
| `ON_LEAVE` | The employee has approved leave covering that day |
| `LATE` | Checked in at or after **11:00** local time |
| `CHECKED_IN` | Checked in, not yet checked out |
| `EARLY_DEPARTURE` | Worked less than **8 hours** |
| `PRESENT` | Worked 8 hours or more |
| `ABSENT` | No check-in |

### Leave
Limits apply over a rolling **6-month (180-day)** window and count both pending and approved leave.

| Type | Limit |
|---|---|
| Annual | 10 days |
| Sick | 15 days |
| Casual | 6 days |
| Festive | 6 days |
| Study, Half Day, Unpaid, Emergency, Others | No limit |

`total_days` is inclusive of both the start and end date. Only `PENDING` leave can be cancelled, and leave that has already been reviewed cannot be reviewed again.

---

## Project structure

```
HRIS/
├── manage.py
├── requirements.txt
├── .env                     # local secrets — never commit
├── HRIS/                    # Django project (settings, urls, wsgi/asgi)
├── HRIS_APPS/               # Main app
│   ├── models.py            # Employee, Department, Leave, Attendance
│   ├── serializers.py
│   ├── auth_serializers.py  # Login with email or username
│   ├── permission.py        # HR / Head / Staff permission rules
│   ├── views.py
│   ├── urls.py
│   ├── migrations/
│   └── tests/               # API, model, serializer and permission tests
└── hris-frontend/           # React + Vite app
    ├── src/
    │   ├── lib/api.js       # API client with automatic token refresh
    │   ├── context/         # App state, loaded from the API
    │   ├── pages/admin/
    │   ├── pages/employee/
    │   └── components/
    └── vite.config.js       # Proxies /api and /media to Django in development
```

---

## Local development

### Prerequisites
- Python **3.12 or newer** (Django 6.1 requirement)
- Node.js 20 or newer
- PostgreSQL

### 1. Database

```sql
CREATE DATABASE hris_db;
CREATE USER hris WITH PASSWORD 'change-me';
ALTER DATABASE hris_db OWNER TO hris;
```

### 2. Environment variables

Create `HRIS/.env` (next to `manage.py`):

```env
SECRET_KEY=replace-with-a-long-random-string
DEBUG=True

DB_NAME=hris_db
DB_USER=hris
DB_PASSWORD=change-me
DB_HOST=127.0.0.1
DB_PORT=5432

ALLOWED_HOSTS=localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

To generate a secret key:

```bash
python -c "from django.core.management.utils import get_random_secret_key as k; print(k())"
```

### 3. Backend

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver        # http://127.0.0.1:8000
```

### 4. Frontend

```bash
cd hris-frontend
npm install
npm run dev                       # http://localhost:5173
```

Vite proxies `/api` and `/media` to Django on port 8000, so open the app at **http://localhost:5173**.

### 5. Create the first admin

`createsuperuser` alone is not enough to log in to the app. Go to **http://127.0.0.1:8000/django-admin/** and:

1. Create a **Department** named `HR`.
2. Create an **Employee** with role **Department Head**, department **HR**, and **User** set to your superuser.

You can now log in at http://localhost:5173 with that username **or** email and reach the Admin / HR workspace. Add the remaining employees from inside the app.

---

## Running tests

Tests use Django's test runner and need access to PostgreSQL (the test user must be allowed to create a database).

```bash
python manage.py test HRIS_APPS
```

The suite covers models, serializers, permissions, authentication and URLs, and the employee, department, leave, attendance and miscellaneous endpoints.

Frontend lint:

```bash
cd hris-frontend
npm run lint
```

---

## API reference

All endpoints are under `/api/` and require `Authorization: Bearer <access token>` unless noted.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/token/` | Log in with `username` (username **or** email) and `password`. Returns `access` and `refresh`. *No auth required.* |
| POST | `/api/auth/token/refresh/` | Exchange `refresh` for a new `access` token. *No auth required.* |
| GET | `/api/me/` | The logged-in user's Employee profile, including `is_hr` |

The access token lasts **1 hour** and the refresh token **7 days**. The frontend refreshes automatically when it receives a 401.

### Resources
| Method | Endpoint | Access |
|---|---|---|
| GET, POST | `/api/employees/` | HR |
| GET, PUT, PATCH, DELETE | `/api/employees/{id}/` | HR |
| GET | `/api/departments/`, `/api/departments/{id}/` | Any logged-in user |
| POST, PUT, PATCH, DELETE | `/api/departments/…` | HR Department Head |
| GET, POST | `/api/leaves/` | Scoped by role (see above). POST files leave for yourself; send `multipart/form-data` to attach a document. |
| GET, DELETE | `/api/leaves/{id}/` | DELETE cancels your own pending leave |
| POST | `/api/leaves/{id}/review/` | HR. Body: `{"status": "APPROVED"}` or `{"status": "REJECTED"}` |
| GET | `/api/attendance/`, `/api/attendance/{id}/` | Scoped by role |
| POST | `/api/attendance/check-in/{employee_id}/` | Your own employee id only |
| POST | `/api/attendance/check-out/{employee_id}/` | Your own employee id only |

### Utility
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health/` | Health check, returns `{"status": "ok"}`. *No auth required.* |
| GET | `/api/csrf/` | Sets the CSRF cookie. *No auth required.* |

Django admin is at `/django-admin/`.

---

## Production deployment (Ubuntu VPS, nginx + gunicorn)

The frontend and API are served from **one domain**: nginx serves the built React app and forwards `/api/` and `/django-admin/` to gunicorn. The frontend calls `/api` with a relative path, so it needs no code changes.

### Before you deploy
The repository is currently set up for development. Make these changes first:

1. **Add gunicorn** to `requirements.txt`, and save the file as **UTF-8** (it is currently UTF-16).
2. **Add to `HRIS/settings.py`:**
   ```python
   STATIC_ROOT = BASE_DIR / 'staticfiles'

   if not DEBUG:
       SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
       SECURE_SSL_REDIRECT = True
       SESSION_COOKIE_SECURE = True
       CSRF_COOKIE_SECURE = True
   ```
3. **Do not upload** `node_modules/`, `__pycache__/`, `db.sqlite3` or your local `.env`. `node_modules` installed on Windows will not run on Linux.

### 1. Server packages

```bash
sudo apt update
sudo apt install python3 python3-venv python3-pip postgresql nginx
# Install Node.js 20+ from NodeSource or nvm
```

Check that `python3 --version` reports **3.12 or newer** (Ubuntu 24.04 or later).

### 2. Database

```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE hris_db;
CREATE USER hris WITH PASSWORD 'a-strong-password';
ALTER DATABASE hris_db OWNER TO hris;
\q
```

### 3. Code and production `.env`

```bash
sudo mkdir -p /var/www/hris && sudo chown $USER:$USER /var/www/hris
# Copy the project into /var/www/hris (git clone, scp or rsync)
cd /var/www/hris
```

Create `/var/www/hris/.env`:

```env
SECRET_KEY=<new random key — not your local one>
DEBUG=False

DB_NAME=hris_db
DB_USER=hris
DB_PASSWORD=a-strong-password
DB_HOST=127.0.0.1
DB_PORT=5432

ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

```bash
chmod 600 .env
```

### 4. Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
python manage.py check --deploy
```

### 5. Frontend build

```bash
cd hris-frontend
npm ci
npm run build          # outputs hris-frontend/dist/
cd ..
```

### 6. gunicorn service

`/etc/systemd/system/hris.service`:

```ini
[Unit]
Description=HRIS gunicorn
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/hris
ExecStart=/var/www/hris/venv/bin/gunicorn HRIS.wsgi:application \
          --bind 127.0.0.1:8001 --workers 3
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo chown -R www-data:www-data /var/www/hris/media 2>/dev/null || sudo -u www-data mkdir -p /var/www/hris/media
sudo systemctl daemon-reload
sudo systemctl enable --now hris
sudo systemctl status hris
```

`www-data` must be able to read the project and `.env`, and write to `media/` (uploaded leave documents).

### 7. nginx

`/etc/nginx/sites-available/hris`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;   # leave document uploads

    root /var/www/hris/hris-frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /django-admin/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/hris/staticfiles/;
    }

    location /media/ {
        alias /var/www/hris/media/;
    }

    # React Router: send unknown paths to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/hris /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> **Note:** with this config, uploaded leave documents under `/media/` can be opened by anyone who has the exact URL. If documents may contain sensitive information (for example medical notes), serve them through an authenticated Django view instead.

### 8. HTTPS

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 9. First admin
Follow [Create the first admin](#5-create-the-first-admin) at `https://yourdomain.com/django-admin/`.

### Updating a deployment

```bash
cd /var/www/hris
# pull or copy the new code
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
cd hris-frontend && npm ci && npm run build && cd ..
sudo systemctl restart hris
```

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| `400 Bad Request` from Django | Domain missing from `ALLOWED_HOSTS` |
| `CSRF Failed` on Django admin | Origin missing from `CSRF_TRUSTED_ORIGINS` (include `https://`) |
| Admin page has no styling | `STATIC_ROOT` not set or `collectstatic` not run |
| `502 Bad Gateway` | gunicorn not running: `sudo journalctl -u hris -n 50` |
| Page refresh on `/admin/...` gives 404 | nginx is missing `try_files ... /index.html` |
| "Not linked to an employee profile" | Create an Employee row for that login |
| Leave document upload fails | `media/` not writable by `www-data`, or file exceeds `client_max_body_size` |
