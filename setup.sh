#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# WarTab — Debian Install Script  v0.6.0
# ═══════════════════════════════════════════════════════════════
# Usage:
#   curl -sL https://raw.githubusercontent.com/warmbo/wartab/main/setup.sh | bash
#   bash setup.sh [options]
#
# Options:
#   --port 8081         Server port (default: 8081)
#   --bind 0.0.0.0      Bind address (default: 0.0.0.0)
#   --user cody         System user (default: current user)
#   --dir /opt/wartab   Install directory (default: /opt/wartab)
#   --repo URL          Git repo URL (default: https://github.com/warmbo/wartab.git)
#   --no-mdns           Disable mDNS/Bonjour advertisement (avahi-utils)
#   --skip-deps         Skip apt dependency installation
#   --uninstall         Remove WarTab service, files, and data
#   --help              Show this help
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

VERSION="0.6.0"

# ── Root detection ──
IS_ROOT=false
[ "$(id -u)" -eq 0 ] && IS_ROOT=true

# ── Defaults ──
PORT="${PORT:-8081}"
BIND="${BIND:-0.0.0.0}"
INSTALL_USER="$(whoami)"
# When running under sudo, prefer the original user
if [ "$IS_ROOT" = true ] && [ -n "${SUDO_USER:-}" ]; then
  INSTALL_USER="$SUDO_USER"
fi
INSTALL_USER="${INSTALL_USER:-root}"
INSTALL_DIR="${INSTALL_DIR:-/opt/wartab}"
REPO_URL="${REPO_URL:-https://github.com/warmbo/wartab.git}"
NO_MDNS=false
SKIP_DEPS=false
UNINSTALL=false

# ── Parse arguments ──
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port=*)     PORT="${1#*=}"; shift ;;
    --port)       PORT="$2"; shift 2 ;;
    --bind=*)     BIND="${1#*=}"; shift ;;
    --bind)       BIND="$2"; shift 2 ;;
    --user=*)     INSTALL_USER="${1#*=}"; shift ;;
    --user)       INSTALL_USER="$2"; shift 2 ;;
    --dir=*)      INSTALL_DIR="${1#*=}"; shift ;;
    --dir)        INSTALL_DIR="$2"; shift 2 ;;
    --repo=*)     REPO_URL="${1#*=}"; shift ;;
    --repo)       REPO_URL="$2"; shift 2 ;;
    --no-mdns)    NO_MDNS=true; shift ;;
    --skip-deps)  SKIP_DEPS=true; shift ;;
    --uninstall)  UNINSTALL=true; shift ;;
    --help|-h)    sed -n '5,21p' "$0"; exit 0 ;;
    *)            echo "Unknown: $1 (use --help)"; exit 1 ;;
  esac
done

# ═══════════════════════════════════════════════════════════════
# TUI Helpers
# ═══════════════════════════════════════════════════════════════

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
BOLD='\033[1m'; DIM='\033[2m'

TOTAL_STEPS=8
CURRENT_STEP=0
BODY_LINES=0        # number of lines in the current step body (below progress bar)

# Draw overall progress bar on the CURRENT line. Uses \r to overwrite in place.
draw_progress() {
  local pct=$((CURRENT_STEP * 100 / TOTAL_STEPS))
  local filled=$((pct * 20 / 100))
  local bar=""
  for ((i=0; i<filled; i++)); do bar+="█"; done
  for ((i=filled; i<20; i++)); do bar+="░"; done
  printf "\r  ${BLUE}Progress: [${bar}${BLUE}] ${CYAN}${CURRENT_STEP}/${TOTAL_STEPS}${NC}   \033[K"
}

# Clear all lines from the current step body, leaving cursor on the
# progress bar line so the next draw_progress overwrites it.
clear_body() {
  local n=$BODY_LINES
  while [ "$n" -gt 0 ]; do
    printf "\033[1A\033[2K"    # cursor up 1, erase entire line
    n=$((n - 1))
  done
  BODY_LINES=0
}

# Begin a new step: clear previous body, update progress bar, print header.
step_header() {
  CURRENT_STEP=$((CURRENT_STEP + 1))
  local desc="$1"
  clear_body                          # cursor now on progress bar line
  draw_progress                       # overwrite progress bar in place
  echo ""                             # first line of new body
  echo ""
  echo -e "  ${BOLD}Step ${CURRENT_STEP}.${NC} ${desc}"
  echo ""
  BODY_LINES=3
}

# Run a command with an animated spinner while suppressed.
# Output replaces itself on a single line until completion.
spin() {
  local msg="$1"
  shift
  "$@" >/dev/null 2>&1 &
  local pid=$!
  local chars='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0
  printf "  ${CYAN}⠿${NC} ${msg}..."
  while kill -0 $pid 2>/dev/null; do
    local c="${chars:$i:1}"
    printf "\r  ${CYAN}${c}${NC} ${msg}..."
    i=$(( (i + 1) % 10 ))
    sleep 0.08
  done
  wait $pid 2>/dev/null || true
  local rc=$?
  if [ "$rc" -eq 0 ]; then
    printf "\r  ${GREEN}✓${NC} ${msg}    \n"
  else
    printf "\r  ${RED}✗${NC} ${msg}    \n"
  fi
  BODY_LINES=$((BODY_LINES + 1))
  return "$rc"
}

# Run a short command, showing output live (no spinner).
run() {
  local msg="$1"
  shift
  printf "  ${CYAN}⠿${NC} ${msg}..."
  if "$@" 2>&1; then
    printf "\r  ${GREEN}✓${NC} ${msg}    \n"
  else
    local rc=$?
    printf "\r  ${RED}✗${NC} ${msg}    \n"
    return "$rc"
  fi
  BODY_LINES=$((BODY_LINES + 1))
}

ok_msg()   { echo -e "  ${GREEN}✓${NC} $1"; BODY_LINES=$((BODY_LINES + 1)); }
warn_msg() { echo -e "  ${YELLOW}⚠${NC} $1"; BODY_LINES=$((BODY_LINES + 1)); }
fail_msg() { echo -e "  ${RED}✗${NC} $1"; exit 1; }
info_msg() { echo -e "  ${BLUE}ℹ${NC} $1"; BODY_LINES=$((BODY_LINES + 1)); }

echo ""
echo -e "  ${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "  ${CYAN}║  ${BOLD}WarTab v${VERSION} — Setup${NC}${CYAN}              ║${NC}"
echo -e "  ${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""
draw_progress
echo ""

# ═══════════════════════════════════════════════════════════════
# Uninstall mode
# ═══════════════════════════════════════════════════════════════

if [ "$UNINSTALL" = true ]; then
  echo ""
  echo -e "  ${CYAN}╔══════════════════════════════════════╗${NC}"
  echo -e "  ${CYAN}║  WarTab — Uninstall                  ║${NC}"
  echo -e "  ${CYAN}╚══════════════════════════════════════╝${NC}"
  echo ""
  if [ "$IS_ROOT" = true ]; then
    # System-level service
    if systemctl is-active --quiet wartab.service 2>/dev/null; then
      systemctl stop wartab.service
      systemctl disable wartab.service
      ok_msg "Service stopped and disabled"
    fi
    rm -f "/etc/systemd/system/wartab.service"
    systemctl daemon-reload
  else
    # User-level service
    if systemctl --user is-active --quiet wartab.service 2>/dev/null; then
      systemctl --user stop wartab.service
      systemctl --user disable wartab.service
      ok_msg "Service stopped and disabled"
    fi
    rm -f "${HOME}/.config/systemd/user/wartab.service"
    systemctl --user daemon-reload
  fi
  if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    ok_msg "Files removed from ${INSTALL_DIR}"
  fi
  echo ""
  echo -e "  ${GREEN}✓ WarTab uninstalled.${NC}"
  exit 0
fi

# ═══════════════════════════════════════════════════════════════
# Step 1 — Install system dependencies
# ═══════════════════════════════════════════════════════════════

step_header "Installing system dependencies"

install_deps() {
  [ "$SKIP_DEPS" = true ] && { ok_msg "Skipped (--skip-deps)"; return 0; }

  local need=""
  command -v python3 &>/dev/null || need="$need python3"
  command -v git &>/dev/null    || need="$need git"
  python3 -c "from PIL import Image" &>/dev/null || need="$need python3-pil"
  command -v avahi-publish-service &>/dev/null || command -v avahi-daemon &>/dev/null || need="$need avahi-daemon avahi-utils"

  if [ -z "$need" ]; then
    ok_msg "All dependencies already present"
    return 0
  fi

  info_msg "Packages to install:${need}"
  spin "Updating apt package lists" sudo apt-get update -qq || fail_msg "apt update failed (check network)"

  # shellcheck disable=SC2086
  spin "Installing:${need}" sudo apt-get install -y -qq $need || fail_msg "apt install failed"
}

install_deps

# ═══════════════════════════════════════════════════════════════
# Step 2 — Preflight checks
# ═══════════════════════════════════════════════════════════════

step_header "Running preflight checks"

preflight_ok=true

command -v python3 &>/dev/null \
  && ok_msg "Python: $(python3 --version 2>&1)" \
  || { warn_msg "python3 not found"; preflight_ok=false; }

command -v git &>/dev/null \
  && ok_msg "Git: $(git --version 2>&1)" \
  || { warn_msg "git not found"; preflight_ok=false; }

if [ "$IS_ROOT" = true ]; then
  if command -v systemctl &>/dev/null && systemctl is-system-running &>/dev/null 2>&1; then
    ok_msg "systemd available (system mode)"
  else
    warn_msg "systemd not detected — service won't auto-start"
  fi
else
  if systemctl --user &>/dev/null; then
    ok_msg "systemd (user mode) available"
  else
    warn_msg "systemd user mode not available"
  fi
fi

ss -tlnp 2>/dev/null | grep -q ":${PORT} " \
  && warn_msg "Port ${PORT} in use — pick another with --port" \
  || ok_msg "Port ${PORT} is available"

python3 -c "from PIL import Image" &>/dev/null \
  && HAS_PIL=true \
  || HAS_PIL=false

[ "$preflight_ok" = false ] && fail_msg "Install python3 and git, then re-run."

# ═══════════════════════════════════════════════════════════════
# Step 3 — Clone repository
# ═══════════════════════════════════════════════════════════════

step_header "Cloning repository"

if [ -d "${INSTALL_DIR}/.git" ]; then
  spin "Updating existing repository" bash -c "cd '${INSTALL_DIR}' && git pull --ff-only"
  ok_msg "Repository updated"
elif [ -d "${INSTALL_DIR}" ]; then
  fail_msg "${INSTALL_DIR} exists but is not a git repo. Remove it: rm -rf ${INSTALL_DIR}"
else
  sudo mkdir -p "$(dirname "${INSTALL_DIR}")" 2>/dev/null || true
  spin "Cloning from ${REPO_URL}" git clone "${REPO_URL}" "${INSTALL_DIR}"
  sudo chown -R "${INSTALL_USER}:${INSTALL_USER}" "${INSTALL_DIR}" 2>/dev/null || true
  ok_msg "Repository cloned"
fi

cd "${INSTALL_DIR}"

# ═══════════════════════════════════════════════════════════════
# Step 4 — Create data directories and initial config
# ═══════════════════════════════════════════════════════════════

step_header "Creating data directories"

run "Creating notes/ uploads/ snapshots/" mkdir -p notes uploads snapshots

run "Creating initial config" bash -c "
  if [ ! -f config.json ]; then
    if [ -f config.example.json ]; then
      cp config.example.json config.json
    else
      echo 'no example' >/dev/null
    fi
  fi
"

if [ ! -f config.json ] && [ -f config.example.json ]; then
  cp config.example.json config.json
  ok_msg "Default config created"
elif [ -f config.json ]; then
  ok_msg "Config file already exists"
else
  warn_msg "No config.example.json — server will use built-in defaults"
fi

# ═══════════════════════════════════════════════════════════════
# Step 5 — Download service icons
# ═══════════════════════════════════════════════════════════════

step_header "Installing service icons"

if [ -f "icons/selfhst-index.json" ]; then
  ok_msg "Service icons already present"
elif [ -f "icons.tar.gz" ]; then
  spin "Extracting from bundled archive" tar xzf icons.tar.gz
  ok_msg "Service icons extracted (icons/)"
else
  if spin "Downloading from selfh.st CDN" python3 download_icons.sh; then
    ok_msg "Service icons downloaded"
  else
    warn_msg "Icon download failed — run later: python3 ${INSTALL_DIR}/download_icons.sh"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# Step 6 — Install Pillow (image resize)
# ═══════════════════════════════════════════════════════════════

step_header "Installing Pillow (image compression)"

if [ "${HAS_PIL:-false}" = false ]; then
  if spin "Installing python3-pil" sudo apt-get install -y python3-pil; then
    ok_msg "Pillow installed"
  else
    warn_msg "Pillow not installed — image uploads won't be resized"
    warn_msg "  Install: sudo apt install python3-pil"
  fi
else
  ok_msg "Pillow already available"
fi

# ═══════════════════════════════════════════════════════════════
# Step 7 — Configure systemd service + mDNS + linger
# ═══════════════════════════════════════════════════════════════

step_header "Configuring systemd service"

MDNS_FLAG=""
[ "$NO_MDNS" = false ] && MDNS_FLAG=" --mdns"
PYTHON_BIN="$(command -v python3)"

# ── Detect service mode ──
if [ "$IS_ROOT" = true ]; then
  SERVICE_DIR="/etc/systemd/system"
  SERVICE_USER="${INSTALL_USER}"
  SYSTEMD_CMD="systemctl"
  LINGER_NEEDED=false
  info_msg "Installing system-level service (running as root)"
else
  SERVICE_DIR="${HOME}/.config/systemd/user"
  SERVICE_USER=""
  SYSTEMD_CMD="systemctl --user"
  LINGER_NEEDED=true
fi

mkdir -p "${SERVICE_DIR}"

cat > "${SERVICE_DIR}/wartab.service" << SERVICE
[Unit]
Description=WarTab — Self-Hosted New Tab Dashboard
Documentation=${REPO_URL}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
${SERVICE_USER:+User=${SERVICE_USER}}
ExecStart=${PYTHON_BIN} ${INSTALL_DIR}/server.py --port ${PORT} --bind ${BIND}${MDNS_FLAG}
WorkingDirectory=${INSTALL_DIR}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
SERVICE

run "Installing systemd unit" ${SYSTEMD_CMD} daemon-reload
${SYSTEMD_CMD} enable wartab.service 2>/dev/null && ok_msg "Service enabled" || warn_msg "systemd enable failed"
spin "Starting service" ${SYSTEMD_CMD} restart wartab.service

if [ "$MDNS_FLAG" != "" ]; then
  ok_msg "mDNS advertisement enabled (avahi)"
fi

# ── Non-root: bootstrap user session and enable linger ──
if [ "$LINGER_NEEDED" = true ]; then
  if ! systemctl --user &>/dev/null; then
    info_msg "Starting systemd user session..."
    sudo loginctl enable-linger "${INSTALL_USER}" 2>/dev/null || true
    sleep 1
    if ! systemctl --user &>/dev/null; then
      uid=$(id -u "${INSTALL_USER}" 2>/dev/null || echo "1000")
      if [ ! -d "/run/user/${uid}" ]; then
        sudo mkdir -p "/run/user/${uid}" 2>/dev/null || true
        sudo chown "${INSTALL_USER}" "/run/user/${uid}" 2>/dev/null || true
        chmod 700 "/run/user/${uid}" 2>/dev/null || true
      fi
    fi
    if systemctl --user &>/dev/null; then
      ok_msg "Systemd user session ready"
    else
      warn_msg "Could not start systemd user session"
      warn_msg "  Log out and back in, then re-run setup"
    fi
  fi

  # Linger
  if ! loginctl show-user "${INSTALL_USER}" 2>/dev/null | grep -q "Linger=yes"; then
    if sudo loginctl enable-linger "${INSTALL_USER}" 2>/dev/null; then
      ok_msg "Linger enabled — service stays running after logout"
    else
      warn_msg "Linger not enabled — service stops when you log out"
    fi
  else
    ok_msg "Linger already enabled"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# Step 8 — Health check
# ═══════════════════════════════════════════════════════════════

step_header "Running health check"

SERVER_OK=false
for i in 1 2 3 4 5; do
  sleep 1
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/" 2>/dev/null || true)
  if [ "$HTTP_CODE" = "200" ]; then
    SERVER_OK=true
    break
  fi
  if [ "$i" -eq 3 ]; then
    draw_progress
    echo ""
    warn_msg "Server still starting... (attempt ${i}/5)"
  fi
done

if [ "$SERVER_OK" = true ]; then
  ok_msg "Server is live (HTTP 200)"
  # Quick API smoke test
  CONFIG_OK=$(curl -s "http://localhost:${PORT}/api/config" | python3 -c "
import json,sys
try:
    d = json.load(sys.stdin)
    v = d.get('version', '') or d.get('_version', '')
    print('ok')
except Exception:
    print('fail')
" 2>/dev/null || echo 'fail')
  [ "$CONFIG_OK" = "ok" ] && ok_msg "Config API responding" || warn_msg "Config API check returned unexpected data"
else
  draw_progress
  echo ""
  warn_msg "Server did not respond within 5 seconds"
  if [ "$IS_ROOT" = true ]; then
    warn_msg "  Check logs: journalctl -u wartab -n 30 --no-pager"
  else
    warn_msg "  Check logs: journalctl --user -u wartab -n 30 --no-pager"
  fi
  fail_msg "Setup incomplete — fix the issue above and re-run"
fi

# ── Firewall hint ──
if command -v ufw &>/dev/null && ! ufw status 2>/dev/null | grep -q "${PORT}/tcp"; then
  warn_msg "UFW may block external access"
  warn_msg "  sudo ufw allow ${PORT}/tcp"
fi

# ═══════════════════════════════════════════════════════════════
# Done
# ═══════════════════════════════════════════════════════════════

HOSTNAME_SHORT=$(hostname -s 2>/dev/null || echo "localhost")
HOSTNAME_FQDN=$(hostname -f 2>/dev/null || echo "$HOSTNAME_SHORT.local")

# Clear step 8 body before showing final output
clear_body
echo ""
echo -e "${GREEN}  ┌──────────────────────────────────────────┐${NC}"
echo -e "${GREEN}  │  ${BOLD}WarTab is up and ready to configure${NC}${GREEN}    │${NC}"
echo -e "${GREEN}  └──────────────────────────────────────────┘${NC}"
echo ""
echo -e "  ${BOLD}${CYAN}→${NC}  ${BOLD}http://${HOSTNAME_FQDN}:${PORT}${NC}"
if [ "$NO_MDNS" = false ]; then
  echo -e "  ${DIM}   http://${HOSTNAME_SHORT}.local:${PORT}${NC}"
fi
echo ""
echo -e "  ${DIM}Set as browser new tab:${NC}"
echo -e "  ${DIM}  Firefox: New Tab Override → http://${HOSTNAME_SHORT}.local:${PORT}${NC}"
echo -e "  ${DIM}  Chrome:  New Tab Redirect  → http://${HOSTNAME_SHORT}.local:${PORT}${NC}"
echo ""
if [ "$IS_ROOT" = true ]; then
  echo -e "  ${DIM}Manage:  systemctl status wartab${NC}"
  echo -e "  ${DIM}Logs:    journalctl -u wartab -f${NC}"
else
  echo -e "  ${DIM}Manage:  systemctl --user status wartab${NC}"
  echo -e "  ${DIM}Logs:    journalctl --user -u wartab -f${NC}"
fi
echo -e "  ${DIM}Config:  ${INSTALL_DIR}/config.json${NC}"
echo ""
