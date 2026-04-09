Master Data app
================

Endpoints (prefix: /api/master-data/)

- `GET /regions/`, `POST /regions/`
- `GET /regions/<id>/`, `PUT/PATCH/DELETE /regions/<id>/`
- Similarly for `areas/` and `branches/`.

Authentication
--------------
Endpoints require authentication (JWT). For development you can create a test user and print tokens:

```powershell
cd project
.venv\Scripts\python.exe manage.py create_test_user
```

Then set the backend URL in your environment:

- For Python scripts (required): set `API_BASE`, e.g. `export API_BASE=http://127.0.0.1:8000` (or on Windows: `set API_BASE=http://127.0.0.1:8000`).
- For the frontend (optional): set `REACT_APP_API_BASE` to override the CRA dev proxy, e.g. `REACT_APP_API_BASE=http://127.0.0.1:8000`. If you leave `REACT_APP_API_BASE` empty, the frontend will use relative paths and the `proxy` defined in `frontend/package.json` during development.

Use the printed `access` token in the Authorization header: `Bearer <access>`.
