#!/usr/bin/env bash
set -euo pipefail
# Migrations can change persistent data; an app rollback does not undo them.
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput
exec .venv/bin/gunicorn config.wsgi:application --bind 0.0.0.0:5100 --workers 2
