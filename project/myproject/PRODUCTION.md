Production deployment notes

Environment variables (suggested):

- `DJANGO_SECRET_KEY` — required in production; do NOT commit secret keys.
- `DJANGO_DEBUG=false` — disable debug in production.
- `DJANGO_ALLOWED_HOSTS` — comma-separated hostnames (e.g. example.com,api.example.com).
- `CORS_ALLOWED_ORIGINS` — comma-separated origins allowed for CORS (e.g. https://app.example.com).
- `CORS_ALLOW_CREDENTIALS` — `true`/`false` (if frontend must send cookies).
- `SESSION_COOKIE_SECURE=true` — ensure cookies sent only over HTTPS.
- `CSRF_COOKIE_SECURE=true` — ensure CSRF cookie only sent over HTTPS.
- `SECURE_SSL_REDIRECT=true` — redirect HTTP -> HTTPS.
- `SECURE_HSTS_SECONDS=31536000` — enable HSTS (1 year) in production.
- `SECURE_HSTS_INCLUDE_SUBDOMAINS=true` — include subdomains in HSTS.
- `SECURE_HSTS_PRELOAD=true` — set when preloading HSTS.
- `SECURE_PROXY_SSL_HEADER=true` — enable if behind a proxy that sets `X-Forwarded-Proto`.

Quick production checklist:

1. Build and collect static assets (if serving static from Django):

```bash
# from project root
python -m venv .venv
.venv/Scripts/activate  # Windows PowerShell
pip install -r requirements.txt
export DJANGO_DEBUG=false
export DJANGO_SECRET_KEY="<your-secret>"
export DJANGO_ALLOWED_HOSTS="example.com,api.example.com"
# set CORS_ALLOWED_ORIGINS to your frontend origin(s)
python manage.py migrate
python manage.py collectstatic --noinput
# start via gunicorn/uvicorn behind a reverse proxy
.venv/Scripts/python.exe -m gunicorn myproject.wsgi:application --bind 0.0.0.0:8000
```

2. If running behind Nginx / load balancer, set `SECURE_PROXY_SSL_HEADER=true`.
3. Verify CORS by visiting your frontend origin and checking API requests succeed with Authorization header.
4. Rotate secrets and restrict access to admin endpoints.

If you want, I can create a `.env.example` with these variables next.
