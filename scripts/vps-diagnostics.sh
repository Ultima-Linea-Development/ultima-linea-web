#!/usr/bin/env bash
set -euo pipefail

section() {
  echo ""
  echo "========== $1 =========="
}

section "Sistema"
date
uptime
echo ""
free -h
echo ""
swapon --show 2>/dev/null || echo "(sin swap)"
echo ""
df -h / /srv 2>/dev/null || df -h /

section "Top procesos por memoria"
ps aux --sort=-%mem | head -n 15

section "Top procesos por CPU"
ps aux --sort=-%cpu | head -n 15

section "Docker: resumen de espacio"
timeout 30 docker system df 2>/dev/null || echo "docker system df tardó demasiado o no está disponible"

section "Docker: contenedores"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Size}}" 2>/dev/null || true

section "Docker: uso en vivo (1 muestra)"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" 2>/dev/null || true

section "Docker: imágenes"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}" 2>/dev/null | head -n 25

section "Docker: build cache"
docker buildx du 2>/dev/null || docker system df | grep -i build || true

section "Memoria del front (si está corriendo)"
docker inspect ultima_linea_front --format 'Estado: {{.State.Status}} | Inicio: {{.State.StartedAt}}' 2>/dev/null || echo "Contenedor ultima_linea_front no encontrado"

echo ""
echo ">> Diagnóstico completo."
