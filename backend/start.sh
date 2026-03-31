#!/usr/bin/env bash
set -euo pipefail

python manage.py migrate --noinput
gunicorn django_project.wsgi:application --bind 0.0.0.0:"${PORT}"
