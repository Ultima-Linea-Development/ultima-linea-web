#!/usr/bin/env bash
set -euo pipefail

section() {
  echo ""
  echo "========== $1 =========="
}

section "Antes de limpiar"
free -h
df -h /

section "Build cache de Docker (suele ser lo que más ocupa tras deploys fallidos)"
docker builder prune -af 2>/dev/null || echo "(builder prune no disponible)"

section "Contenedores detenidos"
docker container prune -f

section "Imágenes sin uso (no afecta contenedores en ejecución)"
docker image prune -af

section "Redes huérfanas"
docker network prune -f

section "Después de limpiar"
docker system df
echo ""
free -h
df -h /

echo ""
echo ">> Limpieza completa. No se tocaron volúmenes ni contenedores activos."
