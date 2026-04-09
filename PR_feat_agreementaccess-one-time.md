Title: feat: implement AgreementAccess one-time DL/ED flow
Branch: feat/agreementaccess-one-time
Commit: fab54cb (short)

Summary
-------
Implements a one-time download/edit access flow for CSA creators on BL agreements.

Changes
-------
- Backend: added `AgreementAccess` and `AuditEvent` models and migrations.
- Backend: enforce atomic consume of download/edit grants in BL agreement create/update/download flows.
- Frontend: updated `frontend/src/components/AgreementPage/BLAgreement.js` to fetch access state, disable Edit/Download buttons for CSA when exhausted, and display a badge with remaining grants.
- Tests: added pytest integration configuration and `project/test_settings.py` to allow test DB creation for legacy `auth_user`.
- Repo: added `.gitignore` and removed `project/.venv` from index.

Files changed (last commit)
---------------------------
Key files changed (recent commits):

- project/myproject/models.py (added `AgreementAccess`, `AuditEvent`, conditional `CustomUser.Meta.managed` for tests)
- project/myproject/migrations/0007_agreementaccess.py
- project/myproject/migrations/0008_auditevent.py
- project/test_settings.py (test-only settings enabling `TEST_MANAGE_AUTH_USER`)
- frontend/src/components/AgreementPage/BLAgreement.js (fetch access state, disable buttons, badge)
- .gitignore (added, removed `project/.venv` from index)

Run `git show HEAD` or `git diff --name-only origin/main...feat/agreementaccess-one-time` for full list.

Notes for reviewer / How to run locally
--------------------------------------
1. Run migrations:

    cd project
    .venv\Scripts\python.exe manage.py migrate

2. Run dev servers:

    # Backend
    .venv\Scripts\python.exe manage.py runserver

    # Frontend
    cd frontend
    npm start

3. Tests:

    # Unit tests only
    .venv\Scripts\python.exe -m pytest -p no:pytest_django -q

    # Integration tests (test settings will make Django manage legacy auth_user)
    set "DJANGO_SETTINGS_MODULE=test_settings"
    .venv\Scripts\python.exe -m pytest -m integration -q

Patch creation
--------------
To create a portable patch of the last commit:

```
cd C:/laragon/www/lolc/operasional
git format-patch -1 HEAD --stdout > feat_agreementaccess-one-time.patch
```

Blockers / Notes
----------------
- Integration tests pass locally using `project/test_settings.py` which sets `TEST_MANAGE_AUTH_USER = True` so Django creates the legacy `auth_user` in test DB.
- Remote push not configured in this repo; branch is local. Push requires remote `origin` URL.

Review checklist
----------------
- [ ] Verify migrations apply cleanly on CI
- [ ] Ensure `CustomUser` mapping to `auth_user` is compatible with production DB (managed=False in prod)
- [ ] Confirm frontend behavior in staging: create → download → edit → download → locked
