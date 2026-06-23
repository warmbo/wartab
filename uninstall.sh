#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# WarTab — Uninstall
# ═══════════════════════════════════════════════════════════════
# Removes WarTab service, files, and data.
# Detects whether the original install was system-level (root) or
# user-level and removes the appropriate service unit.
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
BOLD='\033[1m'

INSTALL_DIR="${INSTALL_DIR:-/opt/wartab}"
IS_ROOT=false
[ "$(id -u)" -eq 0 ] && IS_ROOT=true

echo ""
echo -e "  ${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "  ${CYAN}║  ${BOLD}WarTab — Uninstall${NC}${CYAN}                  ║${NC}"
echo -e "  ${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

removed_any=false

# ── Stop and remove systemd service ──
if [ "$IS_ROOT" = true ]; then
  # System-level service
  if systemctl is-active --quiet wartab.service 2>/dev/null; then
    systemctl stop wartab.service
    echo -e "  ${GREEN}✓${NC} Service stopped"
    removed_any=true
  fi
  if systemctl is-enabled --quiet wartab.service 2>/dev/null; then
    systemctl disable wartab.service 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Service disabled"
    removed_any=true
  fi
  if [ -f "/etc/systemd/system/wartab.service" ]; then
    rm -f "/etc/systemd/system/wartab.service"
    systemctl daemon-reload
    echo -e "  ${GREEN}✓${NC} Service unit removed (/etc/systemd/system/wartab.service)"
    removed_any=true
  fi
else
  # User-level service
  if systemctl --user is-active --quiet wartab.service 2>/dev/null; then
    systemctl --user stop wartab.service
    echo -e "  ${GREEN}✓${NC} Service stopped"
    removed_any=true
  fi
  if systemctl --user is-enabled --quiet wartab.service 2>/dev/null; then
    systemctl --user disable wartab.service 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Service disabled"
    removed_any=true
  fi
  local_service="${HOME}/.config/systemd/user/wartab.service"
  if [ -f "$local_service" ]; then
    rm -f "$local_service"
    systemctl --user daemon-reload
    echo -e "  ${GREEN}✓${NC} Service unit removed (~/.config/systemd/user/wartab.service)"
    removed_any=true
  fi
fi

# ── Remove install directory ──
if [ -d "$INSTALL_DIR" ]; then
  echo ""
  echo -e "  ${YELLOW}⚠${NC} This will remove ALL data in ${INSTALL_DIR}:"
  echo -e "     config.json, notes, uploads, snapshots, icons, and app files"
  echo ""
  echo -n "  Remove ${INSTALL_DIR}? [y/N] "
  read -r confirm
  if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    rm -rf "$INSTALL_DIR"
    echo -e "  ${GREEN}✓${NC} Files removed from ${INSTALL_DIR}"
    removed_any=true
  else
    echo -e "  ${BLUE}ℹ${NC} Skipped — ${INSTALL_DIR} left in place"
  fi
fi

echo ""
if [ "$removed_any" = true ]; then
  echo -e "  ${GREEN}✓ WarTab has been uninstalled.${NC}"
else
  echo -e "  ${YELLOW}⚠${NC} WarTab does not appear to be installed."
  echo -e "     No service or directory found at ${INSTALL_DIR}."
fi
echo ""
