#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${POP_ORGANIZE_APP_DIR:-/var/www/pop-organize}"
ENV_FILE="${POP_ORGANIZE_ENV_FILE:-/etc/pop-organize.env}"
SERVICE_NAME="${POP_ORGANIZE_SERVICE:-pop-organize}"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Repository not found at $APP_DIR" >&2
  exit 1
fi

if [[ ! -r "$ENV_FILE" ]]; then
  echo "Environment file is not readable: $ENV_FILE" >&2
  exit 1
fi

cd "$APP_DIR"
git pull --ff-only

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

npm ci
npm run typecheck
npm run build

sudo systemctl restart "$SERVICE_NAME"
curl --fail --silent --show-error --retry 6 --retry-delay 2 \
  "http://127.0.0.1:${PORT:-3000}/api/health"
echo
