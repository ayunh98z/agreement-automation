Development notes
=================

This project includes a few developer helpers used during local development and
CI-focused test runs. These are intended for developer convenience and do not
affect production runtime behavior.

1) Test runner helper
---------------------
- `project/scripts/run_test_scripts.py` runs all `project/test_*.py` scripts
  and ensures the `project` directory is added to `PYTHONPATH` so the scripts
  can `import myproject` when executed from the workspace root.

  Usage (Windows):

    .\.venv\Scripts\python.exe project\scripts\run_test_scripts.py

2) JSON normalization
---------------------
- `project/myproject/views.py` includes a helper `_normalize_for_json(obj)` to
  convert `Decimal`, `datetime`, and other non-JSON-serializable types into
  serializable values for API responses that are built from raw DB rows.

  Rationale: some legacy tables return `Decimal` or `datetime` values directly
  which caused test scripts that call `json.dumps()` to fail.

3) DB helper (dev)
-------------------
- `project/scripts/set_contract_autoinc.py` is a small convenience script that
  dumps `contract` table metadata and rows to `project/scripts/db_backups/` and
  then attempts to set `contract.contract_id` to `AUTO_INCREMENT`. Only use
  after taking a backup and with caution; this is provided because the local
  development DB had legacy PK values set to 0 which prevented inserts.

Commit policy
-------------
- The helpers are intentionally developer-focused. If you include them in the
  repo, mark them in commit messages or documentation as "dev-only".
