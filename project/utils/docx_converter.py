import subprocess
import tempfile
from pathlib import Path
from typing import IO

from django.conf import settings


class LibreOfficeConversionError(RuntimeError):
    pass


def _get_libreoffice_path() -> str:
    return getattr(settings, "LIBREOFFICE_PATH", r"C:\Program Files\LibreOffice\program\soffice.exe")


def _get_timeout() -> int:
    return int(getattr(settings, "LIBREOFFICE_TIMEOUT", 60))


def convert_docx_to_pdf_stream(docx_path: str) -> IO[bytes]:
    """
    Convert a DOCX file to PDF using LibreOffice in headless mode and
    return an open file-like object for the produced PDF.

    The conversion runs inside a temporary directory and the resulting
    PDF is opened for reading and returned. Caller is responsible for
    closing the returned file object.

    Raises LibreOfficeConversionError on failure.
    """
    docx_p = Path(docx_path)
    if not docx_p.exists():
        raise FileNotFoundError(docx_path)

    libo = _get_libreoffice_path()
    timeout = _get_timeout()

    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            completed = subprocess.run(
                [libo, "--headless", "--convert-to", "pdf", str(docx_p), "--outdir", tmpdir],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout,
            )
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode(errors="replace") if getattr(e, "stderr", None) else ""
            raise LibreOfficeConversionError(f"LibreOffice conversion failed: {stderr}")
        except subprocess.TimeoutExpired:
            raise LibreOfficeConversionError("LibreOffice conversion timed out")

        # LibreOffice usually writes <basename>.pdf into tmpdir, but to be safe
        # pick the only .pdf produced or fallback to expected name.
        tmp = Path(tmpdir)
        pdf_candidates = list(tmp.glob("*.pdf"))
        if not pdf_candidates:
            expected = tmp / (docx_p.stem + ".pdf")
            if expected.exists():
                pdf_path = expected
            else:
                raise LibreOfficeConversionError("No PDF produced by LibreOffice")
        else:
            # prefer exact basename match if present
            exact = [p for p in pdf_candidates if p.name == docx_p.stem + ".pdf"]
            pdf_path = exact[0] if exact else pdf_candidates[0]

        return open(pdf_path, "rb")


def convert_template_name_to_pdf_stream(template_name: str) -> IO[bytes]:
    """
    Convenience helper to convert a DOCX template located under
    `templates/docx/<template_name>.docx` to PDF and return the file object.
    """
    # Resolve base dir via settings.BASE_DIR if available, else assume
    # project package parent directories.
    base = getattr(settings, "BASE_DIR", None)
    if base:
        base_path = Path(base)
    else:
        # assume this file is in project/utils/ -> templates at project/templates
        base_path = Path(__file__).resolve().parents[2]

    tpl = base_path / "templates" / "docx" / f"{template_name}.docx"
    return convert_docx_to_pdf_stream(str(tpl))
