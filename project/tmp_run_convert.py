import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','myproject.settings')
from myproject.common import _convert_docx_to_pdf

src = r'C:\laragon\www\lolc\operasional-final-deploy\operasional\project\templates\docx\bl_agreement_template.docx'
dst = r'C:\laragon\www\lolc\operasional-final-deploy\operasional\project\tmp_pdf\bl_agreement_template_common_run.pdf'
ok, err = _convert_docx_to_pdf(src, dst)
print('OK=', ok)
print('ERR=', err)
