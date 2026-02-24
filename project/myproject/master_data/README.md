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

Then set `REACT_APP_API_BASE` in frontend to `http://127.0.0.1:8001` and use the printed `access` token in Authorization header: `Bearer <access>`.
