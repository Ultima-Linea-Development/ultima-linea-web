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
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose build

echo ">> Restarting containers..."
docker compose up -d

echo ">> Deploy complete."
docker compose ps
