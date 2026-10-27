#!/usr/bin/env bash
# Start a public tunnel for the API, then Expo with that API URL.
# WSL2 is NAT'd, so with `expo start --tunnel` the phone cannot reach the API
# on the host — it needs its own public URL.
set -euo pipefail
cd "$(dirname "$0")/.."

API_PORT="${API_PORT:-3100}"
COMPOSE="docker compose -f $(pwd)/../docker-compose.yml"

if ! curl -sf -m 3 "http://localhost:${API_PORT}/api/health" >/dev/null; then
  echo "API not reachable on :${API_PORT}. Start it (docker compose up -d), or set API_PORT=3000 for a local backend." >&2
  exit 1
fi

compose_url() {
  $COMPOSE logs --no-color tunnel 2>/dev/null |
    grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1 || true
}

API_URL="$(compose_url)"
if [[ -z "$API_URL" ]] && command -v docker >/dev/null && docker info >/dev/null 2>&1; then
  echo "Starting cloudflared via docker compose…"
  if $COMPOSE --profile tunnel up -d tunnel >/dev/null 2>&1; then
    for _ in $(seq 1 30); do
      API_URL="$(compose_url)"
      [[ -n "$API_URL" ]] && break
      sleep 1
    done
  fi
fi

LOG="$(mktemp)"
TUNNEL_PID=""
cleanup() { [[ -n "$TUNNEL_PID" ]] && kill "$TUNNEL_PID" 2>/dev/null || true; }
trap cleanup EXIT

if [[ -z "$API_URL" ]] && command -v cloudflared >/dev/null; then
  cloudflared tunnel --url "http://localhost:${API_PORT}" --no-autoupdate >"$LOG" 2>&1 &
  TUNNEL_PID=$!
  for _ in $(seq 1 30); do
    API_URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)"
    [[ -n "$API_URL" ]] && break
    sleep 1
  done
elif [[ -z "$API_URL" ]] && command -v ngrok >/dev/null; then
  ngrok http "$API_PORT" --log=stdout >"$LOG" 2>&1 &
  TUNNEL_PID=$!
  for _ in $(seq 1 30); do
    API_URL="$(curl -sf http://127.0.0.1:4040/api/tunnels | grep -Eo '"public_url":"https://[^"]+' | head -1 | cut -d'"' -f4 || true)"
    [[ -n "$API_URL" ]] && break
    sleep 1
  done
fi

if [[ -z "${API_URL:-}" ]]; then
  echo "No tunnel available. Either:" >&2
  echo "  - run 'docker compose --profile tunnel up -d tunnel' (cloudflared, no account), or" >&2
  echo "  - install cloudflared, or ngrok and run 'ngrok config add-authtoken <token>'." >&2
  exit 1
fi

echo "API tunnel: $API_URL"
EXPO_PUBLIC_API_URL="$API_URL" npx expo start --tunnel ngrok
