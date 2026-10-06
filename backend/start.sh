#!/usr/bin/env sh
set -eu

mkdir -p data static staticfiles
exec gunicorn config.wsgi:application --bind "[::]:${PORT:-8000}" --workers "${WEB_CONCURRENCY:-2}"
