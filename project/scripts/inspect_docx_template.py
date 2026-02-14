from docxtpl import DocxTemplate
import os

template_path = os.path.join(os.path.dirname(__file__), '..', 'templates', 'docx', 'bl_agreement_template.docx')
template_path = os.path.abspath(template_path)
print('TEMPLATE_PATH:' + template_path)
if not os.path.exists(template_path):
    print('ERROR: template not found')
    raise SystemExit(1)

try:
    tpl = DocxTemplate(template_path)
except Exception as e:
    print('ERROR_LOADING:' + str(e))
    raise

# get undeclared variables
try:
    vars = tpl.get_undeclared_template_variables()
    print('VARS:' + ','.join(sorted(map(str, vars))))
except Exception as e:
    print('ERROR_VARS:' + str(e))

# print some textual content from paragraphs to help locate formatting
try:
    paras = [p.text for p in tpl.docx.paragraphs if p.text and p.text.strip()]
    print('PARA_COUNT:' + str(len(paras)))
    for i, t in enumerate(paras[:40], 1):
        print(f'P{i}:' + t[:200].replace('\n',' '))
except Exception as e:
    print('ERROR_PARAS:' + str(e))
