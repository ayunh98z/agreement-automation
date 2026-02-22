import os
import sys
import django

# Ensure project root is on sys.path so `myproject` package can be imported
proj_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if proj_root not in sys.path:
    sys.path.insert(0, proj_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from docxtpl import DocxTemplate
from django.db import connection
from myproject.views import format_number_dot, number_to_indonesian_words, format_indonesian_date

template_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'templates', 'docx', 'bl_agreement_template.docx'))
contract_number = 'CON005'

if not os.path.exists(template_path):
    print('TEMPLATE_MISSING')
    raise SystemExit(1)

tpl = DocxTemplate(template_path)
placeholders = set(map(str, tpl.get_undeclared_template_variables()))

# fetch data
with connection.cursor() as cursor:
    cursor.execute('SELECT * FROM bl_agreement WHERE contract_number=%s LIMIT 1', [contract_number])
    row = cursor.fetchone()
    cols = [c[0] for c in cursor.description] if cursor.description else []
    agreement = dict(zip(cols, row)) if row else {}

    cursor.execute('SELECT * FROM bl_collateral WHERE contract_number=%s LIMIT 1', [contract_number])
    crow = cursor.fetchone()
    ccols = [c[0] for c in cursor.description] if cursor.description else []
    collateral = dict(zip(ccols, crow)) if crow else {}

# build ctx same as view
ctx = {}
if isinstance(agreement, dict):
    for k, v in agreement.items():
        ctx[k] = v
if isinstance(collateral, dict):
    for k, v in collateral.items():
        if k not in ctx:
            ctx[k] = v
ctx['contract_number'] = contract_number

numeric_keys = ['loan_amount', 'admin_fee', 'net_amount', 'notaris_fee', 'mortgage_amount', 'total_amount']
for nk in numeric_keys:
    val = ctx.get(nk)
    try:
        ctx[nk] = format_number_dot(val) if val is not None else ''
    except Exception:
        ctx[nk] = val
    try:
        ctx[nk + '_in_word'] = number_to_indonesian_words(val) if val is not None else ''
    except Exception:
        ctx[nk + '_in_word'] = ''

date_keys = ['agreement_date', 'date_birth_of_debtor', 'date_birth_of_bm', 'sp3_date', 'date_of_delegated']
for dk in date_keys:
    v = ctx.get(dk)
    try:
        ctx[dk + '_in_word'] = format_indonesian_date(v) if v else ''
    except Exception:
        ctx[dk + '_in_word'] = ''

try:
    if ctx.get('agreement_date'):
        from datetime import datetime
        s = str(ctx.get('agreement_date'))
        try:
            d = datetime.fromisoformat(s).date()
        except Exception:
            try:
                d = datetime.strptime(s, '%Y-%m-%d').date()
            except Exception:
                d = None
        if d:
            ctx['agreement_day_in_word'] = number_to_indonesian_words(d.day)
        else:
            ctx['agreement_day_in_word'] = ''
    else:
        ctx['agreement_day_in_word'] = ''
except Exception:
    ctx['agreement_day_in_word'] = ''

# check placeholders vs ctx
missing = []
empty = []
filled = []
for p in sorted(placeholders):
    val = ctx.get(p, None)
    if val is None:
        missing.append(p)
    else:
        sval = str(val).strip()
        if sval == '':
            empty.append(p)
        else:
            filled.append((p, sval[:200]))

print('PLACEHOLDERS_COUNT:' + str(len(placeholders)))
print('MISSING_COUNT:' + str(len(missing)))
if missing:
    print('MISSING:' + ','.join(missing))
print('EMPTY_COUNT:' + str(len(empty)))
if empty:
    print('EMPTY:' + ','.join(empty))
print('FILLED_COUNT:' + str(len(filled)))
# print few filled
for k, v in filled[:40]:
    print('FILLED:' + k + '=' + v)
