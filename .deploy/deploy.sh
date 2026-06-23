#!/usr/bin/env bash
# WarTab auto-deploy: pull latest main and restart server if changed
set -euo pipefail

REPO="/home/cody/Projects/wartab"
PORT="${1:-8081}"
LOG="$HOME/.wartab-deploy.log"

log() {
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[$ts] $*" >> "$LOG"
  echo "[$ts] $*"
}

cd "$REPO"

# Fetch without changing working tree
git fetch origin main 2>&1 || { log "ERROR: git fetch failed"; exit 1; }

# Check if we're behind
BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")
if [ "$BEHIND" -eq 0 ]; then
  log "Up to date (main)."
  exit 0
fi

log "Behind by $BEHIND commit(s). Deploying..."

# Record current HEAD for rollback
OLD_HEAD=$(git rev-parse HEAD)

# Pull latest
git pull origin main 2>&1 || { log "ERROR: git pull failed"; exit 1; }

NEW_HEAD=$(git rev-parse HEAD)
log "Deployed: ${OLD_HEAD:0:8}..${NEW_HEAD:0:8}"

# Find and restart the Python server on the target port
PID=$(pgrep -f "python3 server.py --port $PORT" 2>/dev/null || true)
if [ -n "$PID" ]; then
  log "Restarting server (PID $PID)..."
  kill "$PID" 2>/dev/null || true
  sleep 1
fi

cd "$REPO"
nohup python3 server.py --port "$PORT" >> "$LOG" 2>&1 &
NEW_PID=$!
disown "$NEW_PID"
log "Server started (PID $NEW_PID) on port $PORT."
