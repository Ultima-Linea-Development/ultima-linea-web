#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/srv/ultima-linea-front}"
BRANCH="${DEPLOY_BRANCH:-main}"
FRONT_IMAGE="${FRONT_IMAGE:-ghcr.io/ultima-linea-development/ultima-linea-web:latest}"

cd "$DEPLOY_DIR"

echo ">> Pulling latest from origin/${BRANCH}..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

if [[ -f scripts/sync-env.sh ]]; then
  echo ">> Syncing environment variables..."
  bash scripts/sync-env.sh
fi

if [[ -z "${GHCR_PULL_TOKEN:-}" ]]; then
  echo ">> ERROR: GHCR_PULL_TOKEN is required to pull the prebuilt image."
  exit 1
fi

echo ">> Logging in to GHCR..."
echo "$GHCR_PULL_TOKEN" | docker login ghcr.io -u "${GHCR_USERNAME:?}" --password-stdin

echo ">> Pruning unused Docker build cache..."
docker builder prune -af 2>/dev/null || true

echo ">> Pulling image ${FRONT_IMAGE}..."
docker pull "$FRONT_IMAGE"

echo ">> Restarting containers..."
export FRONT_IMAGE
docker compose up -d --no-build --pull never

echo ">> Deploy complete."
docker compose ps
