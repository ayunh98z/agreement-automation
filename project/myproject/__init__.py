"""Project package init.

If running against MySQL and using `pymysql`, this ensures PyMySQL
acts as MySQLdb for Django. The import is safe when `pymysql` is
installed; if not installed, Django will continue to use the default
DB backend (SQLite) unless MySQL env vars are set and `pymysql` is available.
"""
import os
try:
	if os.environ.get('MYSQL_NAME') or os.environ.get('MYSQL_DATABASE'):
		import pymysql
		pymysql.install_as_MySQLdb()
except Exception:
	# If pymysql isn't installed, let Django raise a clear error when trying to use MySQL
	pass
