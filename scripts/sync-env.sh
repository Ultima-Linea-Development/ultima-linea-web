#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/srv/ultima-linea-front}"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env}"

required_vars=(
  MONGODB_URI
  MONGODB_DATABASE
  JWT_SECRET
  NEXT_PUBLIC_SITE_URL
  CLOUDINARY_CLOUD_NAME
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
)

for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo ">> Falta la variable ${var}; se mantiene el .env actual."
    exit 0
  fi
done

umask 077
cat > "$ENV_FILE" <<EOF
MONGODB_URI=${MONGODB_URI}
MONGODB_DATABASE=${MONGODB_DATABASE}
JWT_SECRET=${JWT_SECRET}
NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
NODE_ENV=${NODE_ENV:-production}
CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
EOF

echo ">> .env actualizado en ${ENV_FILE}"
