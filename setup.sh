#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# WarTab — Debian Install Script  v0.3.0
# ═══════════════════════════════════════════════════════════════
# Usage:
#   curl -sL https://raw.githubusercontent.com/your-repo/wartab/main/setup.sh | bash
#   bash setup.sh [options]
#
# Options:
#   --port 8081         Server port (default: 8081)
#   --bind 0.0.0.0      Bind address (default: 0.0.0.0)
#   --user cody         System user (default: current user)
#   --dir /opt/wartab   Install directory (default: /opt/wartab)
#   --repo URL          Git repo URL (default: https://github.com/nousresearch/wartab.git)
#   --uninstall         Remove WarTab service, files, and data
#   --help              Show this help
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

VERSION="0.3.0"

# ── Defaults ──
PORT="${PORT:-8081}"
BIND="${BIND:-0.0.0.0}"
INSTALL_USER="${INSTALL_USER:-$(whoami)}"
INSTALL_DIR="${INSTALL_DIR:-/opt/wartab}"
REPO_URL="${REPO_URL:-https://github.com/nousresearch/wartab.git}"
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
    --uninstall)  UNINSTALL=true; shift ;;
    --help|-h)    sed -n '3,17p' "$0"; exit 0 ;;
    *)            echo "Unknown: $1 (use --help)"; exit 1 ;;
  esac
done

# ── Colors ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${BLUE}::${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1"; exit 1; }

# ── Uninstall mode ──
if [ "$UNINSTALL" = true ]; then
  info "Uninstalling WarTab..."
  if systemctl --user is-active --quiet wartab.service 2>/dev/null; then
    systemctl --user stop wartab.service
    systemctl --user disable wartab.service
    ok "Service stopped and disabled"
  fi
  rm -f "${HOME}/.config/systemd/user/wartab.service"
  systemctl --user daemon-reload
  if [ -d "$INSTALL_DIR" ]; then
    warn "Removing $INSTALL_DIR ..."
    rm -rf "$INSTALL_DIR"
    ok "Files removed"
  fi
  echo -e "${GREEN}WarTab uninstalled.${NC}"
  exit 0
fi

# ── Preflight ──
SEP="${CYAN}────────────────────────────────────────────${NC}"
echo -e "\n${SEP}"
echo -e "${CYAN}  WarTab Installer v${VERSION}${NC}"
echo -e "${SEP}\n"

# Run preflight checks
preflight() {
  local fail=0

  # Python
  if command -v python3 &>/dev/null; then
    ok "Python: $(python3 --version 2>&1)"
  else
    warn "Python 3 not found — install: sudo apt install python3"
    fail=1
  fi

  # Git
  if command -v git &>/dev/null; then
    ok "Git: $(git --version 2>&1)"
  else
    warn "Git not found — install: sudo apt install git"
    fail=1
  fi

  # Systemd (user mode)
  if systemctl --user &>/dev/null; then
    ok "systemd (user mode) available"
  else
    warn "systemd user mode not available — service won't auto-start"
  fi

  # Port check
  if ss -tlnp "sport = :${PORT}" 2>/dev/null | grep -q .; then
    warn "Port ${PORT} is already in use — pick another with --port"
  else
    ok "Port ${PORT} is available"
  fi

  # Pillow
  if python3 -c "from PIL import Image; print('ok')" &>/dev/null; then
    HAS_PIL=true
    ok "Pillow (PIL) available — images will be compressed on upload"
  else
    HAS_PIL=false
    warn "Pillow not installed — image uploads won't be resized"
  fi

  [ "$fail" -eq 1 ] && err "Fix the above issues and re-run."
}
preflight

# ── Clone / Update ──
info "Setting up WarTab in ${INSTALL_DIR}..."

if [ -d "${INSTALL_DIR}/.git" ]; then
  info "Updating existing installation..."
  cd "${INSTALL_DIR}"
  git pull --ff-only
  ok "Repository updated"
elif [ -d "${INSTALL_DIR}" ]; then
  warn "${INSTALL_DIR} exists but is not a git repo"
  warn "  Remove it first: rm -rf ${INSTALL_DIR}"
  exit 1
else
  sudo mkdir -p "$(dirname "${INSTALL_DIR}")" 2>/dev/null || true
  git clone "${REPO_URL}" "${INSTALL_DIR}"
  ok "Repository cloned from ${REPO_URL}"
  sudo chown -R "${INSTALL_USER}:${INSTALL_USER}" "${INSTALL_DIR}" 2>/dev/null || true
fi

cd "${INSTALL_DIR}"

# ── Data dirs ──
mkdir -p notes uploads snapshots
ok "Data directories: notes/ uploads/ snapshots/"

# ── Download icons ──
if [ ! -f "${INSTALL_DIR}/icons/selfhst-index.json" ]; then
  info "Downloading service icons (selfh.st)..."
  python3 "${INSTALL_DIR}/download_icons.sh" && ok "Icons downloaded" || warn "Icon download failed — run download_icons.sh manually"
else
  ok "Icons already present (${INSTALL_DIR}/icons/)"
fi

# ── Install Pillow if needed ──
if [ "$HAS_PIL" = false ] && command -v pip3 &>/dev/null; then
  info "Attempting to install Pillow..."
  pip3 install --user Pillow 2>/dev/null \
    && ok "Pillow installed" \
    || warn "Pillow install failed — images won't be resized"
fi

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
ExecStart=${PYTHON_BIN} ${INSTALL_DIR}/server.py --port ${PORT} --bind ${BIND}
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
systemctl --user enable wartab.service
systemctl --user restart wartab.service
ok "systemd service installed and started"

# ── Linger (keep running after logout) ──
if ! loginctl show-user "${INSTALL_USER}" 2>/dev/null | grep -q "Linger=yes"; then
  sudo loginctl enable-linger "${INSTALL_USER}" 2>/dev/null \
    && ok "Linger enabled — service stays running after logout" \
    || warn "Could not enable linger — run: sudo loginctl enable-linger ${INSTALL_USER}"
fi

# ── Health check ──
info "Waiting for server to respond..."
for i in 1 2 3 4 5; do
  sleep 1
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/" 2>/dev/null || true)
  if [ "$HTTP_CODE" = "200" ]; then
    ok "Server responded with HTTP ${HTTP_CODE}"
    break
  fi
  if [ "$i" -eq 5 ]; then
    warn "Server didn't respond in time — check: journalctl --user -u wartab -n 20"
  fi
done

# ── Firewall ──
if command -v ufw &>/dev/null && ! ufw status 2>/dev/null | grep -q "${PORT}/tcp"; then
  warn "Port ${PORT} not open in UFW. To allow external access:"
  warn "  sudo ufw allow ${PORT}/tcp"
fi

# ── Done ──
HOSTNAME_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  WarTab v${VERSION} installed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}Local:${NC}    http://localhost:${PORT}"
[ -n "${HOSTNAME_IP}" ] && echo -e "  ${BLUE}Network:${NC}  http://${HOSTNAME_IP}:${PORT}"
echo ""
echo "  Manage:  systemctl --user status wartab"
echo "  Logs:    journalctl --user -u wartab -f"
echo "  Config:  ${INSTALL_DIR}/config.json"
echo "  Data:    ${INSTALL_DIR}/{notes,snapshots,uploads}/"
echo ""
echo -e "${SEP}"
echo ""
