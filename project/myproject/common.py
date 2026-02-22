from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


def _resolve_username(request):
    try:
        auth_user = getattr(request, 'user', None)
        if auth_user and getattr(auth_user, 'is_authenticated', False):
            return getattr(auth_user, 'username', None) or getattr(auth_user, 'full_name', None) or ''
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1].strip()
            try:
                payload = AccessToken(token)
                uname = payload.get('username') or payload.get('user') or payload.get('user_name')
                if uname:
                    return uname
                user_id = payload.get('user_id') or payload.get('uid') or payload.get('id')
                if user_id:
                    u = User.objects.filter(pk=user_id).first()
                    if u:
                        return getattr(u, 'username', None) or getattr(u, 'full_name', None) or ''
            except Exception:
                try:
                    import jwt
                    payload_raw = jwt.decode(token, options={"verify_signature": False})
                    uname = payload_raw.get('username') or payload_raw.get('user') or payload_raw.get('user_name')
                    if uname:
                        return uname
                except Exception:
                    pass
    except Exception:
        pass
    return ''


def _get_request_user_and_now(request):
    try:
        uname = _resolve_username(request) or 'public'
    except Exception:
        uname = 'public'
    try:
        now = timezone.now()
    except Exception:
        from datetime import datetime
        now = datetime.utcnow()
    return uname, now


def _normalize_for_json(obj):
    try:
        from decimal import Decimal
        import datetime as _dt
    except Exception:
        return obj

    if obj is None:
        return None
    if isinstance(obj, Decimal):
        try:
            return float(obj)
        except Exception:
            return str(obj)
    if isinstance(obj, (_dt.datetime, _dt.date, _dt.time)):
        try:
            return obj.isoformat()
        except Exception:
            return str(obj)
    if isinstance(obj, bytes):
        try:
            return obj.decode('utf-8')
        except Exception:
            return str(obj)
    if isinstance(obj, dict):
        return {k: _normalize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [ _normalize_for_json(v) for v in obj ]
    return obj


def _ensure_synthesized_pk(cursor, cols_meta, data_map, table_name):
    try:
        pk_row = next((r for r in cols_meta if (r[3] or '').upper() == 'PRI'), None)
        if not pk_row:
            candidate = next((r for r in cols_meta if (r[0] or '').lower() in ('id','contract_id','uv_collateral_id','bl_collateral_id')), None)
            pk_row = candidate
        if not pk_row:
            return

        pk_name = pk_row[0]
        extra = (pk_row[5] or '').lower()
        if pk_name in data_map:
            return
        if 'auto_increment' in extra:
            return
        try:
            cursor.execute(f"SELECT COALESCE(MAX({pk_name}), 0) + 1 FROM {table_name}")
            row = cursor.fetchone()
            if row and row[0] is not None:
                data_map[pk_name] = row[0]
        except Exception:
            return
    except Exception:
        return


def format_number_dot(val):
    try:
        if val is None:
            return ''
        v = float(val)
        return f"{v:,.0f}".replace(',', '.')
    except Exception:
        return str(val)


def _refined_title_case(s, acronyms=None):
    """Title-case a string but preserve acronyms and RT/RW patterns.

    - `acronyms`: iterable of tokens to always render as ALL-CAPS (e.g. 'NPWP','SHM').
    - Tokens like 'RT01', 'RW02', 'RT/RW', 'RT/RW01' will be kept uppercase.
    - Tokens containing digits (e.g. 'SP3') are uppercased.
    - Otherwise words are capitalized (first letter upper, rest lower).
    """
    try:
        import re
        if not s:
            return ''
        acro_set = set(x.upper() for x in (acronyms or ['PT', 'CV', 'NPWP', 'KTP', 'SP3', 'SHM', 'AJB', 'BPKB', 'SH', 'SK']))
        parts = []
        for token in str(s).split():
            m = re.match(r"(^[^\w]*)([\w\-/&.]+)([^\w]*$)", token)
            if m:
                pre, core, post = m.groups()
                core_up = core.upper()
                # RT/RW patterns (with optional separators and digits)
                if re.match(r'^(RT|RW)([:/\\-]?\d*)$', core, flags=re.IGNORECASE):
                    out_core = core_up
                # explicit acronyms or any short all-letter token <=4 chars that is all upper
                elif core_up in acro_set or (core.isupper() and len(core) <= 5) or any(c.isdigit() for c in core):
                    out_core = core_up
                else:
                    out_core = core.capitalize()
                parts.append(pre + out_core + post)
            else:
                parts.append(token.capitalize())
        return ' '.join(parts)
    except Exception:
        try:
            return str(s).title()
        except Exception:
            return s


def number_to_indonesian_words(n, title_case=False):
    """Konversi angka menjadi kata-kata Indonesia.
    Returns sentence-case by default, or Title Case when `title_case=True`.
    """
    try:
        def _sentence_case(s):
            try:
                if not s:
                    return ''
                s = str(s).strip()
                return s[0].upper() + s[1:].lower() if len(s) > 1 else s.upper()
            except Exception:
                return s

        def _title_case(s):
            try:
                if not s:
                    return ''
                return _refined_title_case(s)
            except Exception:
                return s

        if n is None or n == '':
            return ''

        n = int(round(float(str(n).strip())))

        if n == 0:
            return _title_case('nol') if title_case else _sentence_case('nol')

        # Basic words
        ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan']
        teens = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas',
                 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas']
        tens = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh',
                'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh']

        def convert_hundreds(num):
            """Convert 0-999 to words (lowercase)."""
            result = []
            if num >= 100:
                if 100 <= num < 200:
                    result.append('seratus')
                else:
                    result.append(ones[num // 100])
                    result.append('ratus')
                num %= 100
            if num >= 20:
                result.append(tens[num // 10])
                if num % 10 > 0:
                    result.append(ones[num % 10])
            elif num >= 10:
                result.append(teens[num - 10])
            elif num > 0:
                result.append(ones[num])
            return ' '.join(result)

        if n < 0:
            out = 'minus ' + number_to_indonesian_words(-n, title_case=title_case)
            return _title_case(out) if title_case else _sentence_case(out)

        if n < 10:
            return _title_case(ones[n]) if title_case else _sentence_case(ones[n])
        if n < 20:
            return _title_case(teens[n - 10]) if title_case else _sentence_case(teens[n - 10])
        if n < 100:
            return _title_case(convert_hundreds(n)) if title_case else _sentence_case(convert_hundreds(n))
        if n < 1000:
            return _title_case(convert_hundreds(n)) if title_case else _sentence_case(convert_hundreds(n))

        if n < 1000000:
            ribu = n // 1000
            sisa = n % 1000
            parts = []
            if ribu == 1:
                parts.append('seribu')
            else:
                # ribu < 1000 here
                parts.append(convert_hundreds(ribu))
                parts.append('ribu')
            if sisa > 0:
                parts.append(convert_hundreds(sisa))
            combined = ' '.join(parts)
            return _title_case(combined) if title_case else _sentence_case(combined)

        if n < 1000000000:
            juta = n // 1000000
            sisa = n % 1000000
            parts = []
            # juta < 1000 here
            parts.append(convert_hundreds(juta))
            parts.append('juta')
            if sisa > 0:
                parts.append(number_to_indonesian_words(sisa, title_case=title_case))
            combined = ' '.join(parts)
            return _title_case(combined) if title_case else _sentence_case(combined)

        # fallback for very large numbers
        return _title_case(str(n)) if title_case else _sentence_case(str(n))
    except Exception:
        return str(n) if n else ''


def date_to_indonesian_words(d, title_case=False):
    """Format tanggal menjadi kata-kata Indonesia (e.g., 'satu maret dua ribu delapan')"""
    try:
        if not d:
            return ''
        from datetime import datetime
        if isinstance(d, str):
            try:
                d = datetime.fromisoformat(d)
            except Exception:
                return d
        
        # Nama bulan dalam bahasa Indonesia (lowercase)
        bulan_indonesia = [
            'januari', 'februari', 'maret', 'april', 'mei', 'juni',
            'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
        ]
        
        hari_kata = number_to_indonesian_words(d.day, title_case=title_case)
        bulan = bulan_indonesia[d.month - 1]
        tahun_kata = number_to_indonesian_words(d.year, title_case=title_case)

        # Combine parts
        combined = f'{hari_kata} {bulan} {tahun_kata}'.strip()
        if not combined:
            return ''
        try:
            if title_case:
                return _refined_title_case(combined)
            # default: sentence case
            return combined[0].upper() + combined[1:].lower() if len(combined) > 1 else combined.upper()
        except Exception:
            return combined
    except Exception:
        return ''


def format_indonesian_date(d):
    """Format tanggal menjadi format Indonesia (e.g., '1 Maret 2008')"""
    try:
        if not d:
            return ''
        from datetime import datetime
        if isinstance(d, str):
            try:
                d = datetime.fromisoformat(d)
            except Exception:
                return d
        
        # Nama bulan dalam bahasa Indonesia (capitalize first letter)
        bulan_indonesia = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ]
        
        hari = d.day  # Tanpa leading zero
        bulan = bulan_indonesia[d.month - 1]
        tahun = d.year
        
        return f'{hari} {bulan} {tahun}'
    except Exception:
        return ''


import tempfile, zipfile, shutil, os, re, subprocess


def _repair_docx_jinja_tags(src_path, contract_no=None):
    try:
        tmpdir = tempfile.mkdtemp(prefix='docx_repair_')
        with zipfile.ZipFile(src_path, 'r') as zin:
            zin.extractall(tmpdir)

        word_dir = os.path.join(tmpdir, 'word')
        if not os.path.exists(word_dir):
            shutil.rmtree(tmpdir)
            return src_path

        changed_files = []
        for root, dirs, files in os.walk(word_dir):
            for fname in files:
                if not fname.lower().endswith('.xml'):
                    continue
                fullpath = os.path.join(root, fname)
                with open(fullpath, 'r', encoding='utf-8') as f:
                    data = f.read()
                if '{{' not in data or '}}' not in data:
                    continue
                orig = data
                new = []
                pos = 0
                L = len(data)
                while pos < L:
                    i = data.find('{{', pos)
                    if i == -1:
                        new.append(data[pos:])
                        break
                    new.append(data[pos:i])
                    j = data.find('}}', i)
                    if j == -1:
                        new.append(data[i:])
                        break
                    segment = data[i:j+2]
                    cleaned = re.sub(r'<[^>]+>', '', segment)
                    if cleaned.count('{{') and cleaned.count('}}'):
                        inner_start = cleaned.find('{{') + 2
                        inner_end = cleaned.rfind('}}')
                        inner = cleaned[inner_start:inner_end]
                        inner = re.sub(r'\s+', '', inner)
                        cleaned_full = '{{' + inner + '}}'
                        new.append(cleaned_full)
                    else:
                        cleaned2 = re.sub(r'<[^>]+>', '', segment)
                        new.append(cleaned2)
                    pos = j+2
                repaired = ''.join(new)
                if repaired != orig:
                    with open(fullpath, 'w', encoding='utf-8') as f:
                        f.write(repaired)
                    rel = os.path.relpath(fullpath, tmpdir)
                    changed_files.append(rel.replace('\\', '/'))

        if changed_files:
            repaired_fd, repaired_path = tempfile.mkstemp(suffix='.docx')
            os.close(repaired_fd)
            with zipfile.ZipFile(repaired_path, 'w', zipfile.ZIP_DEFLATED) as zout:
                for root, dirs, files in os.walk(tmpdir):
                    for file in files:
                        full = os.path.join(root, file)
                        arcname = os.path.relpath(full, tmpdir)
                        zout.write(full, arcname)
            try:
                logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
                os.makedirs(logs_dir, exist_ok=True)
                repair_log = os.path.join(logs_dir, 'docx_repair.log')
                with open(repair_log, 'a', encoding='utf-8') as lf:
                    lf.write(f"[{timezone.now().isoformat()}] repaired={repaired_path} contract={contract_no} files={changed_files}\n")
            except Exception:
                pass
            shutil.rmtree(tmpdir)
            return repaired_path
        else:
            shutil.rmtree(tmpdir)
            return src_path
    except Exception:
        try:
            shutil.rmtree(tmpdir)
        except Exception:
            pass
        return src_path


def _safe_rmtree(path):
    try:
        if os.path.exists(path):
            shutil.rmtree(path)
    except Exception:
        pass


def _convert_docx_to_pdf(src, dst):
    """Convert DOCX to PDF using docx2pdf library.
    
    Returns (True, '') on success or (False, error_message) on failure.
    Supports both Windows and Linux/Unix systems.
    """
    try:
        from docx2pdf import convert
    except ImportError:
        return False, 'docx2pdf library not installed. Install with: pip install docx2pdf'
    
    try:
        # Create output directory if it doesn't exist
        out_dir = os.path.dirname(dst)
        if out_dir and not os.path.exists(out_dir):
            os.makedirs(out_dir, exist_ok=True)
        
        # For Windows: Initialize COM thread before conversion
        try:
            import pythoncom
            pythoncom.CoInitialize()
            com_initialized = True
        except Exception:
            com_initialized = False
        
        try:
            # docx2pdf.convert expects (input_file, output_file)
            # It will create the output file at the specified path
            convert(src, dst)
            
            # Verify output file was created and is not empty
            if os.path.exists(dst) and os.path.getsize(dst) > 0:
                return True, ''
            else:
                return False, 'PDF file was not created or is empty'
        finally:
            # Uninitialize COM thread if it was initialized
            if com_initialized:
                try:
                    pythoncom.CoUninitialize()
                except Exception:
                    pass
    except Exception as e:
        return False, f'docx2pdf conversion failed: {str(e)}'
