#!/bin/bash
# Agent Self-Registration Script
# Usage: ./agent-install.sh [AGENT_ID] [AGENT_NAME] [AGENT_TYPE]
# Example: ./agent-install.sh hermes-001 "Hermes" hermes

set -e

ACP_URL="${ACP_URL:-http://localhost:3101}"
ACP_USER="${ACP_USER:-admin}"
ACP_PASS="${ACP_PASS:-admin123}"

AGENT_ID="${1:-$(hostname)-$(date +%s)}"
AGENT_NAME="${2:-$(hostname)}"
AGENT_TYPE="${3:-custom}"

echo "Agent Control Panel — Self Registration"
echo "========================================"
echo "ACP URL:    $ACP_URL"
echo "Agent ID:   $AGENT_ID"
echo "Agent Name: $AGENT_NAME"
echo "Agent Type: $AGENT_TYPE"
echo ""

# Login
echo "[1/3] Logging in..."
TOKEN=$(curl -s -X POST "$ACP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ACP_USER\",\"password\":\"$ACP_PASS\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "ERROR: Failed to login. Check ACP_URL and credentials."
    exit 1
fi
echo "[✓] Logged in"

# Register agent
echo "[2/3] Registering agent..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$ACP_URL/api/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$AGENT_ID\",\"name\":\"$AGENT_NAME\",\"type\":\"$AGENT_TYPE\"}")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "[✓] Agent registered"
elif [ "$HTTP_CODE" = "409" ]; then
    echo "[i] Agent already registered"
else
    echo "ERROR: Failed to register agent (HTTP $HTTP_CODE)"
    exit 1
fi

# Heartbeat function
send_heartbeat() {
    local status="${1:-active}"
    local task="${2:-idle}"
    curl -s -X POST "$ACP_URL/api/agents/$AGENT_ID/heartbeat" \
      -H "Authorization: Bearer $TOKEN" \
      -d "status=$status" \
      -d "current_task=$task" > /dev/null 2>&1
}

# Start heartbeat loop
echo "[3/3] Starting heartbeat (every 5 minutes)..."
echo "[✓] Agent is now connected to ACP"
echo ""
echo "Press Ctrl+C to stop heartbeat"
echo ""

while true; do
    send_heartbeat "active" "$(date '+%H:%M:%S') - alive"
    sleep 300
done
