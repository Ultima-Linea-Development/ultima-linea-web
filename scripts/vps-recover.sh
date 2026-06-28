#!/usr/bin/env bash
set -euo pipefail

section() {
  echo ""
  echo "========== $1 =========="
}

section "Estado inicial"
free -h
uptime

section "Detener builds colgados en el host"
pkill -TERM -f "docker-compose compose build" 2>/dev/null || true
pkill -TERM -f "docker compose build" 2>/dev/null || true
pkill -TERM -f "docker-buildx bake" 2>/dev/null || true
sleep 3
pkill -KILL -f "docker-compose compose build" 2>/dev/null || true
pkill -KILL -f "docker compose build" 2>/dev/null || true
pkill -KILL -f "docker-buildx bake" 2>/dev/null || true

section "Detener contenedores de build (conservar front, traefik, mongo)"
keep_pattern='^(ultima_linea_front|traefik|.*mongo.*)$'
while read -r cid name; do
  [[ -z "$cid" ]] && continue
  if [[ "$name" =~ $keep_pattern ]]; then
    echo "  conservar: $name"
    continue
  fi
  echo "  detener: $name ($cid)"
  docker stop "$cid" 2>/dev/null || true
done < <(docker ps --format '{{.ID}} {{.Names}}')

section "Limpiar cache e imágenes Docker"
docker builder prune -af 2>/dev/null || true
docker image prune -af 2>/dev/null || true
docker container prune -f 2>/dev/null || true
docker network prune -f 2>/dev/null || true

section "Estado final"
free -h
df -h /
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

echo ""
echo ">> Recuperación completa. Reiniciá el front con deploy o: cd /srv/ultima-linea-front && docker compose up -d"
