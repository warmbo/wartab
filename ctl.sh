#!/usr/bin/env bash
# WarTab Control Panel — start/stop/restart/status via systemd
# NOTE: wartab runs as a SYSTEM unit (/etc/systemd/system/wartab.service).
# The old --user variants were stale and never controlled the real service.
set -euo pipefail

SERVICE="wartab.service"
PORT="${1:-8081}"
REPO="/home/cody/Projects/wartab"

tput clear
echo "╔══════════════════════════════════════╗"
echo "║        WarTab Control Panel          ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Current status
STATUS="$(systemctl is-active "$SERVICE" 2>/dev/null || echo 'inactive')"
ENABLED="$(systemctl is-enabled "$SERVICE" 2>/dev/null || echo 'not-found')"
PID="$(pgrep -f 'python3.*server.py.*port.*8081' 2>/dev/null || true)"

echo "  Service:   $SERVICE"
echo "  Status:    $STATUS"
echo "  Enabled:   $ENABLED"
echo "  Port:      $PORT"
echo "  PID:       ${PID:-—}"
echo ""

if [ "$STATUS" = "active" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/" 2>/dev/null || echo '000')
  echo "  HTTP:      $HTTP_CODE"
  echo "  URL:       http://localhost:$PORT"
  echo "  Caddy:     https://tab.warho.me"
fi
echo ""

# Menu
echo "  [1] Start   — systemctl start $SERVICE"
echo "  [2] Stop    — systemctl stop $SERVICE"
echo "  [3] Restart — systemctl restart $SERVICE"
echo "  [4] Status  — journalctl -u $SERVICE -n 15 --no-pager"
echo "  [5] Logs    — journalctl -u $SERVICE -f"
echo "  [6] Raw     — python3 server.py --port $PORT (foreground)"
echo ""
echo "  [0] Exit"
echo ""

read -rp "  Choose [0-6]: " choice
echo ""

case "$choice" in
  1)
    echo "  Starting $SERVICE..."
    systemctl start "$SERVICE"
    sleep 1
    systemctl is-active "$SERVICE" && echo "  ✓ Started" || echo "  ✗ Failed"
    ;;
  2)
    echo "  Stopping $SERVICE..."
    systemctl stop "$SERVICE"
    sleep 1
    systemctl is-active "$SERVICE" && echo "  ✗ Still running" || echo "  ✓ Stopped"
    ;;
  3)
    echo "  Restarting $SERVICE..."
    systemctl restart "$SERVICE"
    sleep 2
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/" 2>/dev/null || echo '000')
    if [ "$HTTP_CODE" = "200" ]; then
      echo "  ✓ Restarted — HTTP $HTTP_CODE"
    else
      echo "  ⚠ Restarted but HTTP $HTTP_CODE — check logs"
      journalctl -u "$SERVICE" -n 5 --no-pager
    fi
    ;;
  4)
    journalctl -u "$SERVICE" -n 15 --no-pager
    ;;
  5)
    journalctl -u "$SERVICE" -f
    ;;
  6)
    echo "  Starting raw (Ctrl+C to stop)..."
    echo ""
    cd "$REPO"
    exec python3 server.py --port "$PORT"
    ;;
  0)
    exit 0
    ;;
  *)
    echo "  Unknown choice: $choice"
    ;;
esac
echo ""
