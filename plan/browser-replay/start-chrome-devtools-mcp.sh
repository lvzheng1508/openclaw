#!/usr/bin/env bash
# Start Chrome DevTools MCP with auto-connect (existing-session attach for OpenClaw profile "user").
# Prerequisites: Chrome 144+ and remote debugging enabled (see plan/browser-replay/README.md).
set -euo pipefail
exec npx --yes chrome-devtools-mcp@latest --autoConnect "$@"
