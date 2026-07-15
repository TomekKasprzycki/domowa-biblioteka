#!/usr/bin/env bash
# Start (or create) the local Postgres container used for development.
# Matches DATABASE_URL in .env.local: postgresql://admin:@dm1n@localhost:54729/postgres
set -euo pipefail

CONTAINER_NAME="domowa-biblioteka-postgres"
VOLUME_NAME="domowa-biblioteka-pgdata"
IMAGE="postgres:16-alpine"
HOST_PORT="54729"
DB_USER="admin"
DB_PASSWORD="@dm1n"
DB_NAME="postgres"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI not found. Install Docker (or enable Docker Desktop's WSL integration for this distro) and retry." >&2
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "${CONTAINER_NAME} is already running."
  exit 0
fi

if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "Starting existing container ${CONTAINER_NAME}..."
  docker start "${CONTAINER_NAME}"
else
  echo "Creating container ${CONTAINER_NAME} from ${IMAGE}..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -e POSTGRES_USER="${DB_USER}" \
    -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
    -e POSTGRES_DB="${DB_NAME}" \
    -p "${HOST_PORT}:5432" \
    -v "${VOLUME_NAME}:/var/lib/postgresql/data" \
    "${IMAGE}"
fi

echo "Waiting for Postgres to accept connections on port ${HOST_PORT}..."
for _ in $(seq 1 30); do
  if docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" >/dev/null 2>&1; then
    echo "Postgres is ready on localhost:${HOST_PORT}."
    exit 0
  fi
  sleep 1
done

echo "Postgres did not become ready in time. Check 'docker logs ${CONTAINER_NAME}'." >&2
exit 1
