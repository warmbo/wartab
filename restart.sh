#!/usr/bin/env bash
# Restart WarTab service and verify health
set -euo pipefail

PORT="${1:-8081}"
SERVICE="wartab.service"

echo ":: Restarting ${SERVICE}..."
systemctl --user restart "${SERVICE}"
sleep 2

STATUS="$(systemctl --user is-active "${SERVICE}" 2>/dev/null || echo 'inactive')"
echo "✓ Status: ${STATUS}"

if [ "${STATUS}" = "active" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/" 2>/dev/null || echo '000')
  echo "✓ HTTP:   ${HTTP_CODE}"
  if [ "${HTTP_CODE}" = "200" ]; then
    echo "✓ WarTab is running on http://localhost:${PORT}"
  else
    echo "⚠ Server running but returned HTTP ${HTTP_CODE}"
    exit 1
  fi
else
  echo "✗ Service failed to start"
  echo "  Logs: journalctl --user -u ${SERVICE} -n 20 --no-pager"
  exit 1
fi
