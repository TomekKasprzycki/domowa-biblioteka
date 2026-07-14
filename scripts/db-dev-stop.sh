#!/usr/bin/env bash
# Stop the local Postgres dev container without deleting its data volume.
set -euo pipefail

CONTAINER_NAME="domowa-biblioteka-postgres"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI not found." >&2
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  docker stop "${CONTAINER_NAME}"
else
  echo "${CONTAINER_NAME} is not running."
fi
