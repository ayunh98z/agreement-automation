import importlib, traceback
try:
    importlib.import_module('myproject.uv_sp3.views')
    print('IMPORTED')
except Exception:
    traceback.print_exc()
    raise
