#!/usr/bin/env bash
# WarTab Control Panel — start/stop/restart/status via systemd
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
STATUS="$(systemctl --user is-active "$SERVICE" 2>/dev/null || echo 'inactive')"
ENABLED="$(systemctl --user is-enabled "$SERVICE" 2>/dev/null || echo 'not-found')"
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
echo "  [1] Start   — systemctl --user start $SERVICE"
echo "  [2] Stop    — systemctl --user stop $SERVICE"
echo "  [3] Restart — systemctl --user restart $SERVICE"
echo "  [4] Status  — journalctl --user -u $SERVICE -n 15 --no-pager"
echo "  [5] Logs    — journalctl --user -u $SERVICE -f"
echo "  [6] Raw     — python3 server.py --port $PORT (foreground)"
echo ""
echo "  [0] Exit"
echo ""

read -rp "  Choose [0-6]: " choice
echo ""

case "$choice" in
  1)
    echo "  Starting $SERVICE..."
    systemctl --user start "$SERVICE"
    sleep 1
    systemctl --user is-active "$SERVICE" && echo "  ✓ Started" || echo "  ✗ Failed"
    ;;
  2)
    echo "  Stopping $SERVICE..."
    systemctl --user stop "$SERVICE"
    sleep 1
    systemctl --user is-active "$SERVICE" && echo "  ✗ Still running" || echo "  ✓ Stopped"
    ;;
  3)
    echo "  Restarting $SERVICE..."
    systemctl --user restart "$SERVICE"
    sleep 2
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/" 2>/dev/null || echo '000')
    if [ "$HTTP_CODE" = "200" ]; then
      echo "  ✓ Restarted — HTTP $HTTP_CODE"
    else
      echo "  ⚠ Restarted but HTTP $HTTP_CODE — check logs"
      journalctl --user -u "$SERVICE" -n 5 --no-pager
    fi
    ;;
  4)
    journalctl --user -u "$SERVICE" -n 15 --no-pager
    ;;
  5)
    journalctl --user -u "$SERVICE" -f
    ;;
  6)
    echo "  Starting raw (Ctrl+C to stop)..."
    echo ""
    cd "$REPO"
    python3 server.py --port "$PORT"
    ;;
  0)
    echo "  Bye."
    exit 0
    ;;
  *)
    echo "  Invalid choice."
    exit 1
    ;;
esac
