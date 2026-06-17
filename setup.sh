#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════
# WarTab — Debian Install Script
# ═══════════════════════════════════════════════════
# Usage:
#   curl -sL https://raw.githubusercontent.com/your-repo/wartab/main/setup.sh | bash
#   # or locally:
#   bash setup.sh
#
# Options:
#   --port 8081         Server port (default: 8081)
#   --bind 0.0.0.0      Bind address (default: 0.0.0.0)
#   --user cody         System user to run under (default: current user)
#   --dir /opt/wartab   Install directory (default: /opt/wartab)
# ═══════════════════════════════════════════════════

# ── Parse arguments ──
PORT="${PORT:-8081}"
BIND="${BIND:-0.0.0.0}"
INSTALL_USER="${INSTALL_USER:-$(whoami)}"
INSTALL_DIR="${INSTALL_DIR:-/opt/wartab}"
REPO_URL="${REPO_URL:-https://github.com/nousresearch/wartab.git}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --bind) BIND="$2"; shift 2 ;;
    --user) INSTALL_USER="$2"; shift 2 ;;
    --dir)  INSTALL_DIR="$2"; shift 2 ;;
    --repo) REPO_URL="$2"; shift 2 ;;
    --help) echo "Usage: $0 [--port 8081] [--bind 0.0.0.0] [--user cody] [--dir /opt/wartab] [--repo URL]"; exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Colors ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}::${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1"; exit 1; }

# ── Preflight checks ──
info "Checking system requirements..."

if [ "$(id -u)" -eq 0 ]; then
  warn "Running as root. Installing system-wide."
else
  info "Running as user: $(whoami)"
fi

# Check Python 3
if command -v python3 &>/dev/null; then
  PY=$(python3 --version 2>&1)
  ok "Python 3 found: $PY"
else
  err "Python 3 is required. Install it: sudo apt install python3"
fi

# Check for pip3 (optional, for PIL support)
HAS_PIL=false
if python3 -c "from PIL import Image; print('ok')" &>/dev/null; then
  HAS_PIL=true
  ok "Pillow (PIL) available — image uploads will be compressed"
else
  warn "Pillow not installed. Image uploads won't be resized."
  warn "  Install: sudo apt install python3-pip && pip3 install Pillow"
fi

# ── Install / update ──
info "Installing WarTab to ${INSTALL_DIR}..."

if [ -d "${INSTALL_DIR}/.git" ]; then
  info "Updating existing installation..."
  cd "${INSTALL_DIR}"
  git pull
  ok "Repository updated"
elif [ -d "${INSTALL_DIR}" ]; then
  warn "${INSTALL_DIR} exists but is not a git repo. Skipping clone."
  warn "  Ensure the files are in place and up to date."
else
  # Clone into install dir
  sudo mkdir -p "$(dirname "${INSTALL_DIR}")" 2>/dev/null || true
  if command -v git &>/dev/null; then
    git clone "${REPO_URL}" "${INSTALL_DIR}"
    ok "Repository cloned from ${REPO_URL}"
  else
    err "git is required. Install: sudo apt install git"
  fi
  # Fix ownership
  sudo chown -R "${INSTALL_USER}:${INSTALL_USER}" "${INSTALL_DIR}" 2>/dev/null || true
fi

cd "${INSTALL_DIR}"

# ── Create data directories ──
mkdir -p notes uploads
ok "Data directories created"

# ── Install Pillow if needed ──
if [ "$HAS_PIL" = false ] && command -v pip3 &>/dev/null; then
  info "Installing Pillow..."
  pip3 install --user Pillow 2>/dev/null && ok "Pillow installed" || warn "Could not install Pillow"
fi

# ── Create systemd user service ──
info "Setting up systemd service..."

SERVICE_DIR="${HOME}/.config/systemd/user"
mkdir -p "${SERVICE_DIR}"

cat > "${SERVICE_DIR}/wartab.service" << EOF
[Unit]
Description=WarTab — New Tab Page Server
After=network.target

[Service]
Type=simple
ExecStart=$(command -v python3) ${INSTALL_DIR}/server.py --port ${PORT} --bind ${BIND}
WorkingDirectory=${INSTALL_DIR}
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable wartab.service
systemctl --user restart wartab.service

ok "systemd service installed and started"

# ── Enable lingering (keeps user service running after logout) ──
if [ "$(loginctl show-user "${INSTALL_USER}" 2>/dev/null | grep Linger=yes)" = "" ]; then
  sudo loginctl enable-linger "${INSTALL_USER}" 2>/dev/null || warn "Could not enable linger (run: sudo loginctl enable-linger ${INSTALL_USER})"
  ok "Linger enabled — service stays running after logout"
fi

# ── Firewall hint ──
if command -v ufw &>/dev/null; then
  if ! ufw status | grep -q "${PORT}/tcp"; then
    warn "Port ${PORT} not open in UFW. To allow external access:"
    warn "  sudo ufw allow ${PORT}/tcp"
  fi
fi

# ── Done ──
echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  WarTab installed successfully!${NC}"
echo -e "${GREEN}  Local:    http://localhost:${PORT}${NC}"
HOSTNAME=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -n "${HOSTNAME}" ]; then
  echo -e "${GREEN}  Network:  http://${HOSTNAME}:${PORT}${NC}"
fi
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "  Manage: systemctl --user status wartab"
echo "  Logs:   journalctl --user -u wartab -f"
echo "  Config: ${INSTALL_DIR}/config.json"
echo "  Notes:  ${INSTALL_DIR}/notes/"
echo "  Uploads:${INSTALL_DIR}/uploads/"
echo ""
