#!/bin/bash
# ACP One-Liner — Connect agent with single command
# Usage: curl -sSL https://raw.githubusercontent.com/serverul/agent-control-panel/main/scripts/acp-onboard.sh | bash -s -- "AgentName" "agent-type"
# Example: curl -sSL .../acp-onboard.sh | bash -s -- "Hermes" "hermes"

set -e

ACP_URL="http://46.225.101.15:3102"
ACP_USER="admin"
ACP_PASS="admin123"

AGENT_NAME="${1:-$(hostname)}"
AGENT_TYPE="${2:-custom}"
AGENT_ID="${AGENT_TYPE}-$(echo $AGENT_NAME | tr ' ' '-' | tr '[:upper:]' '[:lower:]')-$(date +%s)"

echo "Connecting '$AGENT_NAME' to ACP..."

# Login
TOKEN=$(curl -s -X POST "$ACP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ACP_USER\",\"password\":\"$ACP_PASS\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

[ -z "$TOKEN" ] && echo "ERROR: Cannot reach ACP" && exit 1

# Register
curl -s -X POST "$ACP_URL/api/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$AGENT_ID\",\"name\":\"$AGENT_NAME\",\"type\":\"$AGENT_TYPE\"}" > /dev/null

echo "✓ Agent '$AGENT_NAME' connected to ACP"
echo "  Dashboard: $ACP_URL"
echo "  Agent ID: $AGENT_ID"

# Heartbeat loop
while true; do
    curl -s -X POST "$ACP_URL/api/agents/$AGENT_ID/heartbeat" \
      -H "Authorization: Bearer $TOKEN" \
      -d "status=active" > /dev/null 2>&1
    sleep 300
done
