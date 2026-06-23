#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# WarTab — Debian Install Script  v0.5.0
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

VERSION="0.5.0"

# ── Defaults ──
PORT="${PORT:-8081}"
BIND="${BIND:-0.0.0.0}"
INSTALL_USER="${INSTALL_USER:-$(whoami)}"
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
    --help|-h)    sed -n '3,17p' "$0"; exit 0 ;;
    *)            echo "Unknown: $1 (use --help)"; exit 1 ;;
  esac
done

# ── Colors ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
BOLD='\033[1m'; DIM='\033[2m'
info()  { echo -e "  ${BLUE}•${NC} $1"; }
ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
err()   { echo -e "  ${RED}✗${NC} $1"; exit 1; }
fail()  { echo -e "  ${RED}✗${NC} $1"; return 1; }

# ── Uninstall mode ──
if [ "$UNINSTALL" = true ]; then
  echo ""
  echo -e "  ${CYAN}WarTab — Uninstall${NC}"
  echo ""
  if systemctl --user is-active --quiet wartab.service 2>/dev/null; then
    systemctl --user stop wartab.service
    systemctl --user disable wartab.service
    ok "Service stopped and disabled"
  fi
  rm -f "${HOME}/.config/systemd/user/wartab.service"
  systemctl --user daemon-reload
  if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    ok "Files removed from ${INSTALL_DIR}"
  fi
  echo ""
  echo -e "  ${GREEN}WarTab has been uninstalled.${NC}"
  exit 0
fi

# ── Header ──
SEP="${CYAN}───────────────────────────────────────────${NC}"
echo ""
echo -e "${SEP}"
echo -e "${CYAN}  WarTab v${VERSION} — Installer${NC}"
echo -e "${SEP}"
echo ""

# ── Install system dependencies (clean Debian) ──
install_deps() {
  [ "$SKIP_DEPS" = true ] && { info "Skipping apt install (--skip-deps)"; return 0; }

  local need=""
  command -v python3 &>/dev/null || need="$need python3"
  command -v git &>/dev/null    || need="$need git"
  python3 -c "from PIL import Image" &>/dev/null || need="$need python3-pil"
  command -v avahi-publish-service &>/dev/null || command -v avahi-daemon &>/dev/null || need="$need avahi-daemon avahi-utils"

  if [ -z "$need" ]; then
    ok "All system dependencies already present"
    return 0
  fi

  info "Installing:${need} ..."
  sudo apt-get update -qq || fail "apt update failed — check network or run --skip-deps"
  # shellcheck disable=SC2086  # intentional word-splitting
  sudo apt-get install -y -qq $need || fail "apt install failed — run with --skip-deps and install manually"
  ok "System dependencies installed"
}

# ── Preflight checks ──
preflight() {
  local fatal=0

  command -v python3 &>/dev/null \
    && ok "Python: $(python3 --version 2>&1)" \
    || { warn "python3 not found"; fatal=1; }

  command -v git &>/dev/null \
    && ok "Git: $(git --version 2>&1)" \
    || { warn "git not found"; fatal=1; }

  systemctl --user &>/dev/null \
    && ok "systemd (user mode) available" \
    || warn "systemd user mode not available — service won't auto-start"

  ss -tlnp 2>/dev/null | grep -q ":${PORT} " \
    && warn "Port ${PORT} is already in use — pick another with --port" \
    || ok "Port ${PORT} is available"

  python3 -c "from PIL import Image" &>/dev/null \
    && HAS_PIL=true \
    || HAS_PIL=false

  [ "$fatal" -eq 1 ] && err "Install python3 and git, then re-run."
  return 0
}

install_deps
preflight

# ── Clone / Update ──
info "Setting up WarTab in ${INSTALL_DIR}..."

if [ -d "${INSTALL_DIR}/.git" ]; then
  info "Updating existing installation..."
  cd "${INSTALL_DIR}"
  git pull --ff-only || warn "git pull failed — continuing with existing code"
  ok "Repository updated"
elif [ -d "${INSTALL_DIR}" ]; then
  err "${INSTALL_DIR} exists but is not a git repo. Remove it: rm -rf ${INSTALL_DIR}"
else
  sudo mkdir -p "$(dirname "${INSTALL_DIR}")" 2>/dev/null || true
  git clone "${REPO_URL}" "${INSTALL_DIR}" || err "git clone failed — check network and URL"
  sudo chown -R "${INSTALL_USER}:${INSTALL_USER}" "${INSTALL_DIR}" 2>/dev/null || true
  ok "Repository cloned from ${REPO_URL}"
fi

cd "${INSTALL_DIR}"

# ── Data directories ──
mkdir -p notes uploads snapshots
ok "Data directories created"

# ── First-run config ──
if [ ! -f "config.json" ]; then
  if [ -f "config.example.json" ]; then
    cp config.example.json config.json
    ok "Default config created from config.example.json"
  else
    warn "config.example.json not found — server will use built-in defaults"
  fi
else
  ok "Config file already exists"
fi

# ── Download service icons (skippable, cosmetic) ──
if [ ! -f "icons/selfhst-index.json" ]; then
  info "Downloading service icons..."
  if python3 download_icons.sh; then
    ok "Service icons downloaded"
  else
    warn "Icon download failed — the Services tab will be unavailable until re-run"
    warn "  Run later: python3 ${INSTALL_DIR}/download_icons.sh"
  fi
else
  ok "Service icons already present"
fi

# ── Install Pillow if still missing ──
if [ "${HAS_PIL:-false}" = false ]; then
  if sudo apt-get install -y python3-pil 2>/dev/null; then
    ok "Pillow installed (python3-pil)"
  else
    warn "Pillow not installed — image uploads won't be resized"
    warn "  Install: sudo apt install python3-pil"
  fi
fi

# ── mDNS flag ──
MDNS_FLAG=""
[ "$NO_MDNS" = false ] && MDNS_FLAG=" --mdns"

# ── systemd user service ──
info "Configuring systemd service..."
SERVICE_DIR="${HOME}/.config/systemd/user"
mkdir -p "${SERVICE_DIR}"
PYTHON_BIN="$(command -v python3)"

cat > "${SERVICE_DIR}/wartab.service" << SERVICE
[Unit]
Description=WarTab — Self-Hosted New Tab Dashboard
Documentation=${REPO_URL}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${PYTHON_BIN} ${INSTALL_DIR}/server.py --port ${PORT} --bind ${BIND}${MDNS_FLAG}
WorkingDirectory=${INSTALL_DIR}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=default.target
SERVICE

systemctl --user daemon-reload
systemctl --user enable wartab.service || warn "systemd enable failed"
systemctl --user restart wartab.service || warn "systemd restart failed — check journalctl --user -u wartab"
ok "Systemd service installed and started"

# ── Linger (keep running after logout) ──
if ! loginctl show-user "${INSTALL_USER}" 2>/dev/null | grep -q "Linger=yes"; then
  sudo loginctl enable-linger "${INSTALL_USER}" 2>/dev/null \
    && ok "Linger enabled — service stays running after logout" \
    || warn "Linger not enabled — service stops when you log out"
fi

# ── Health check ──
info "Waiting for server to respond..."
SERVER_OK=false
for i in 1 2 3 4 5; do
  sleep 1
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/" 2>/dev/null || true)
  if [ "$HTTP_CODE" = "200" ]; then
    SERVER_OK=true
    break
  fi
done

if [ "$SERVER_OK" = true ]; then
  ok "Server is live (HTTP 200)"
  # Quick API smoke test
  CONFIG_OK=$(curl -s "http://localhost:${PORT}/api/config" | python3 -c "
import json,sys
try:
    d = json.load(sys.stdin)
    v = d.get('version', '') or d.get('_version', '')
    print('ok' if v else 'empty')
except Exception:
    print('fail')
" 2>/dev/null || echo 'fail')
  [ "$CONFIG_OK" = "ok" ] && ok "Config API responding" || warn "Config API check returned unexpected data"
else
  warn "Server did not respond within 5 seconds"
  warn "  Check logs: journalctl --user -u wartab -n 30 --no-pager"
  err "Setup incomplete — fix the issue above and re-run"
fi

# ── Firewall hint ──
if command -v ufw &>/dev/null && ! ufw status 2>/dev/null | grep -q "${PORT}/tcp"; then
  warn "UFW may block external access"
  warn "  sudo ufw allow ${PORT}/tcp"
fi

# ── Derive hostname for final output ──
HOSTNAME_SHORT=$(hostname -s 2>/dev/null || echo "localhost")
HOSTNAME_FQDN=$(hostname -f 2>/dev/null || echo "$HOSTNAME_SHORT.local")

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
echo -e "  ${DIM}Manage:  systemctl --user status wartab${NC}"
echo -e "  ${DIM}Logs:    journalctl --user -u wartab -f${NC}"
echo -e "  ${DIM}Config:  ${INSTALL_DIR}/config.json${NC}"
echo ""
echo -e "${SEP}"
echo ""
