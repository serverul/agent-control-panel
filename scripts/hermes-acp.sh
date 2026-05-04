#!/bin/bash
# Hermes ACP Integration
# Adds Hermes to Agent Control Panel automatically
# Run this once on the machine where Hermes is installed

set -e

ACP_URL="http://46.225.101.15:3102"
ACP_USER="admin"
ACP_PASS="admin123"
AGENT_ID="hermes-$(hostname)"
AGENT_NAME="Hermes"

echo "Hermes ACP Integration"
echo "======================"

# Get Hermes info
HERMES_MODEL=""
HERMES_PROVIDER=""

if [ -f "$HOME/.hermes/config.yaml" ]; then
    HERMES_MODEL=$(grep "model:" ~/.hermes/config.yaml | head -1 | awk '{print $2}' | tr -d '"')
    HERMES_PROVIDER=$(grep "provider:" ~/.hermes/config.yaml | head -1 | awk '{print $2}' | tr -d '"')
fi

echo "Model: ${HERMES_MODEL:-unknown}"
echo "Provider: ${HERMES_PROVIDER:-unknown}"
echo "Agent ID: $AGENT_ID"
echo ""

# Login
echo "[1/3] Connecting to ACP..."
TOKEN=$(curl -s -X POST "$ACP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ACP_USER\",\"password\":\"$ACP_PASS\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

[ -z "$TOKEN" ] && echo "ERROR: Cannot reach ACP at $ACP_URL" && exit 1

# Register
echo "[2/3] Registering Hermes..."
curl -s -X POST "$ACP_URL/api/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\":\"$AGENT_ID\",
    \"name\":\"$AGENT_NAME\",
    \"type\":\"hermes\",
    \"model\":\"$HERMES_MODEL\",
    \"provider\":\"$HERMES_PROVIDER\"
  }" > /dev/null

echo "[3/3] Starting heartbeat..."
echo ""
echo "✓ Hermes connected to ACP!"
echo "  Dashboard: $ACP_URL"
echo ""
echo "Heartbeat running (5 min interval). Press Ctrl+C to stop."

# Heartbeat
while true; do
    STATUS="active"
    TASK="Processing"
    
    # Check if Hermes is actually running
    if ! pgrep -f "hermes" > /dev/null 2>&1; then
        STATUS="idle"
        TASK="Not running"
    fi
    
    curl -s -X POST "$ACP_URL/api/agents/$AGENT_ID/heartbeat" \
      -H "Authorization: Bearer $TOKEN" \
      -d "status=$STATUS" \
      -d "current_task=$TASK" > /dev/null 2>&1
    
    sleep 300
done
