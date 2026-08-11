#!/usr/bin/env bash
# WarTab deploy: pull the deployed branch and restart the SYSTEM unit if changed.
# NOTE: superseded by the in-app self-update system (Settings > System > Updates)
# for interactive use. Kept for scripted/CI deploys. Uses `git reset --hard` +
# `systemctl restart` (never nohup) so the service stays under systemd control.
set -euo pipefail

REPO="/home/cody/Projects/wartab"
PORT="${1:-8081}"
SERVICE="wartab.service"
LOG="$HOME/.wartab-deploy.log"

log() {
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[$ts] $*" >> "$LOG"
  echo "[$ts] $*"
}

cd "$REPO"

# The deployed branch (master on the box). The self-update system tracks this.
DEPLOY_BRANCH="${2:-master}"

# Fetch without changing working tree
git fetch origin "$DEPLOY_BRANCH" 2>&1 || { log "ERROR: git fetch failed"; exit 1; }

# Check if we're behind
if git merge-base --is-ancestor HEAD "origin/$DEPLOY_BRANCH" && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/$DEPLOY_BRANCH)" ]; then
  log "Up to date ($DEPLOY_BRANCH)."
  exit 0
fi

log "Deploying $DEPLOY_BRANCH..."

# Record current HEAD for rollback
OLD_HEAD=$(git rev-parse HEAD)

# Hard reset to the deployed branch (clean; config.json is gitignored so it
# survives). Do NOT git pull/merge — the tree carries untracked runtime files.
git reset --hard "origin/$DEPLOY_BRANCH" 2>&1 || { log "ERROR: git reset failed"; exit 1; }

NEW_HEAD=$(git rev-parse HEAD)
log "Deployed: ${OLD_HEAD:0:8}..${NEW_HEAD:0:8}"

# Restart via systemd (system unit) — never nohup, which would leave an
# unmanaged duplicate process holding the port.
systemctl restart "$SERVICE" || { log "ERROR: systemctl restart failed"; exit 1; }
sleep 2
systemctl is-active "$SERVICE" >/dev/null 2>&1 || { log "ERROR: $SERVICE not active after restart"; exit 1; }
log "Restarted $SERVICE (now $NEW_HEAD)."
