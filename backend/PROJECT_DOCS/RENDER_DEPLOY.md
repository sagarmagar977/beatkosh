# Render Backend Deploy

This backend is ready to run on Render with:

- `gunicorn` in `requirements.txt`
- `whitenoise` for static files
- `DATABASE_URL` support for Supabase/Postgres
- ImageKit support for media

## Render service settings

Use a Render web service with:

- Root Directory: `backend`
- Build Command: `bash build.sh`
- Start Command: `bash start.sh`

The start script runs migrations automatically before booting Gunicorn, which is useful on Render free tier when shell access is not available.

## Required env vars

Set these in Render:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS=your-backend.onrender.com`
- `DJANGO_CSRF_TRUSTED_ORIGINS=https://your-frontend-domain.com,https://your-backend.onrender.com`
- `DJANGO_SECURE_SSL_REDIRECT=True`
- `DJANGO_DB_SSL_REQUIRE=True`
- `DB_CONN_MAX_AGE=0`
- `DATABASE_URL=...` (Supabase Postgres URL)
- `IMAGEKIT_ENABLED=True`
- `IMAGEKIT_PUBLIC_KEY=...`
- `IMAGEKIT_PRIVATE_KEY=...`
- `IMAGEKIT_URL_ENDPOINT=...`
- `IMAGEKIT_MEDIA_ROOT=BeatKosh`
- `GOOGLE_OAUTH_CLIENT_ID=...` if Google auth is used

## First deploy

After the web service is created:

1. Add the env vars above.
2. Deploy once.
3. Render will run migrations automatically during startup via `start.sh`.

## Verification

After deploy, verify:

- `/api/v1/health/` responds
- existing beats load
- producer profiles load
- media URLs resolve from ImageKit
- login/auth flows still work

## Supabase connection limit note

If you see errors like `remaining connection slots are reserved`, switch `DATABASE_URL` to the Supabase session/transaction pooler URL instead of the direct database URL, and keep `DB_CONN_MAX_AGE=0`.
