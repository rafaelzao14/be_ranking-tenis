#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/ranking-tenis/be_ranking-tenis}"
IMAGE="${IMAGE:?IMAGE is required}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.vps.yml}"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "Erro: repositorio nao encontrado em $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

git fetch origin main
git checkout main
git pull --ff-only origin main

if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
fi

IMAGE="$IMAGE" docker compose -f "$COMPOSE_FILE" pull api
IMAGE="$IMAGE" docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

docker image prune -f
