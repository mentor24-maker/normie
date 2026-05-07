#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PORTS=(3000 3001 3002)

for port in "${PORTS[@]}"; do
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Killing listeners on port $port: $pids"
    kill -9 $pids
  fi
done

echo "Removing .next cache"
rm -rf .next

echo "Starting Next dev server on port 3001"
exec npm run dev -- --port 3001
