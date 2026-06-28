#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/srv/ultima-linea-front}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$DEPLOY_DIR"

echo ">> Pulling latest from origin/${BRANCH}..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

if [[ -f scripts/sync-env.sh ]]; then
  echo ">> Syncing environment variables..."
  bash scripts/sync-env.sh
fi

echo ">> Building containers..."
if [[ "${SKIP_DOCKER_BUILD:-0}" == "1" ]]; then
  echo ">> Skipping build (image prebuilt in CI)."
else
  docker compose build
fi

echo ">> Restarting containers..."
if [[ "${SKIP_DOCKER_BUILD:-0}" == "1" ]]; then
  docker compose up -d --no-build
else
  docker compose up -d
fi

echo ">> Deploy complete."
docker compose ps
