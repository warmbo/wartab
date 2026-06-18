#!/usr/bin/env bash
# Save browser config to server, verify, then restart service
set -euo pipefail
PORT="${1:-8081}"

echo ":: Current config on server..."
curl -s "http://localhost:${PORT}/api/config" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  Cards: {len(d.get(\"cards\",[]))}')
print(f'  Has fontSizeText: {\"fontSizeText\" in d.get(\"theme\",{})}')
print(f'  Has pageWidth: {\"pageWidth\" in d.get(\"layout\",{})}')
print(f'  Keys in layout: {list(d.get(\"layout\",{}).keys())}')
"

echo ""
echo ":: Server status: $(systemctl --user is-active wartab.service)"
echo ":: URL: http://localhost:${PORT}/"
