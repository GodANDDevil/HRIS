# HRIS Frontend

This directory contains the React and Tailwind CSS frontend. Django runs separately as the backend and API.

## Run locally

Start Django in one terminal from the parent `HRIS` directory:

```powershell
cd ..\HRIS
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Start Vite in this directory in another terminal:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/*` requests to Django at `http://127.0.0.1:8000`.

The backend health endpoint is available at `/api/health/`, and `/api/csrf/` initializes the CSRF cookie for API mutations.

## Scripts

- `npm run dev` starts the Vite development server.
- `npm run build` creates a production build.
- `npm run lint` runs Oxlint.
- `npm run preview` serves the production build locally.
