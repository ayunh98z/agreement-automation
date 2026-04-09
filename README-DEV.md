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

Agreement access (CSA one-time flow)
-----------------------------------
- Feature: per-agreement, per-creator (`CSA`) access grants are tracked so a CSA
  creator receives: 1 download -> 1 edit -> 1 download -> locked. Enforcement is
  performed server-side and reflected in the frontend UI.
- Key backend pieces:
  - Model: `AgreementAccess` (tracks `download_grants`, `edit_grants`, consumed
    counters and `locked` flag) and `AuditEvent` (persistent audit logs).
  - Endpoint: GET `/api/bl-agreement/<contract_number>/access/` returns access
    status for the caller (used by frontend to render buttons).
  - Consumption: download and edit handlers consume grants atomically using
    `select_for_update()` and record `AuditEvent` on success.
- Frontend changes:
  - Component: `frontend/src/components/AgreementPage/BLAgreement.js` now
    requests access state and disables the Edit/Download buttons for the CSA
    creator when grants are exhausted. A small badge shows remaining `DL` and
    `ED` counts and `locked` state.

Developer steps (tests & build)
User Guide
----------

Panduan pengguna dipindahkan ke [docs/PANDUAN-PENGGUNA.md](docs/PANDUAN-PENGGUNA.md#L1).

   - Untuk akses terbatas, gunakan fitur one-time access (akses sekali pakai)
     dengan masa berlaku singkat.
   - Untuk kolaborasi internal, berikan peran `lihat/komentar/edit` sesuai
     kebutuhan.

9. Keamanan & Privasi
   - Jangan bagikan kredensial akun. Gunakan logout pada perangkat publik.
   - Hanya beri akses kepada orang yang membutuhkan. Semua aksi dicatat di
     audit log.

10. Troubleshooting Umum
    - Login gagal: cek username/password atau hubungi admin.
    - File gagal unggah: cek format dan ukuran; coba koneksi internet.
    - Akses ditolak: ajukan permintaan akses atau hubungi pemilik dokumen.

11. Best Practices
    - Gunakan komentar dan versi untuk kolaborasi, jangan edit versi final
      tanpa menyimpan sebagai versi baru.
    - Periksa audit trail sebelum menyetujui dokumen.
    - Ikuti konvensi penamaan untuk memudahkan pencarian.

12. Dukungan & Feedback
    - Laporkan bug atau permintaan fitur ke tim pengembang dengan langkah
      reproduksi dan screenshot bila perlu.
    - Untuk masalah akses atau akun, hubungi admin sistem.

Catatan akhir: Jika Anda ingin, saya dapat memindahkan bagian ini ke file
terpisah `docs/PANDUAN-PENGGUNA.md` atau menambahkan daftar langkah cepat di
antarmuka aplikasi.

