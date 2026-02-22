import py_compile
try:
    py_compile.compile('myproject/uv_sp3/views.py', doraise=True)
    print('COMPILED')
except Exception as e:
    import traceback
    traceback.print_exc()
    raise
