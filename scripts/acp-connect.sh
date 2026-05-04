#!/bin/bash
# ACP Connector — Connect any agent to Agent Control Panel
# Usage: ./acp-connect.sh [AGENT_NAME] [AGENT_TYPE]
# Example: ./acp-connect.sh "Hermes" "hermes"

set -e

ACP_URL="${ACP_URL:-http://46.225.101.15:3102}"
ACP_USER="${ACP_USER:-admin}"
ACP_PASS="${ACP_PASS:-admin123}"

AGENT_NAME="${1:-$(hostname)}"
AGENT_TYPE="${2:-custom}"
AGENT_ID="${AGENT_TYPE}-$(echo $AGENT_NAME | tr ' ' '-' | tr '[:upper:]' '[:lower:]')-$(date +%s)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ACP Connector — Agent Onboarding   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}ACP:${NC} $ACP_URL"
echo -e "  ${BLUE}Agent:${NC} $AGENT_NAME ($AGENT_TYPE)"
echo -e "  ${BLUE}ID:${NC} $AGENT_ID"
echo ""

# Step 1: Login
echo -e "${GREEN}[1/4]${NC} Logging in..."
TOKEN=$(curl -s -X POST "$ACP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ACP_USER\",\"password\":\"$ACP_PASS\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "ERROR: Failed to login to ACP at $ACP_URL"
    exit 1
fi
echo -e "${GREEN}[✓]${NC} Logged in"

# Step 2: Get agent info
echo -e "${GREEN}[2/4]${NC} Detecting agent info..."

# Try to detect model from common locations
MODEL=""
PROVIDER=""

# Check Hermes config
if [ -f "$HOME/.hermes/config.yaml" ]; then
    MODEL=$(grep -A1 "model:" ~/.hermes/config.yaml | tail -1 | tr -d ' "' | head -c 50)
    PROVIDER=$(grep -A1 "provider:" ~/.hermes/config.yaml | tail -1 | tr -d ' "' | head -c 50)
fi

# Check environment
if [ -z "$MODEL" ] && [ -n "$HERMES_MODEL" ]; then
    MODEL="$HERMES_MODEL"
fi

echo -e "${GREEN}[✓]${NC} Model: ${MODEL:-unknown}, Provider: ${PROVIDER:-unknown}"

# Step 3: Register agent
echo -e "${GREEN}[3/4]${NC} Registering with ACP..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$ACP_URL/api/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\":\"$AGENT_ID\",
    \"name\":\"$AGENT_NAME\",
    \"type\":\"$AGENT_TYPE\",
    \"model\":\"$MODEL\",
    \"provider\":\"$PROVIDER\"
  }")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}[✓]${NC} Registered successfully"
elif [ "$HTTP_CODE" = "409" ]; then
    echo -e "${YELLOW}[i]${NC} Already registered"
else
    echo "ERROR: Registration failed (HTTP $HTTP_CODE)"
    exit 1
fi

# Step 4: Start heartbeat
echo -e "${GREEN}[4/4]${NC} Starting heartbeat..."
echo -e "${GREEN}[✓]${NC} Connected to ACP!"
echo ""
echo -e "  ${BLUE}Dashboard:${NC} $ACP_URL"
echo -e "  ${YELLOW}Press Ctrl+C to disconnect${NC}"
echo ""

# Save agent info
cat > /tmp/acp-agent-info.json << EOF
{
  "agent_id": "$AGENT_ID",
  "agent_name": "$AGENT_NAME",
  "agent_type": "$AGENT_TYPE",
  "acp_url": "$ACP_URL",
  "connected_at": "$(date -Iseconds)"
}
EOF

# Heartbeat function
send_heartbeat() {
    local status="${1:-active}"
    local task="${2:-}"
    
    # Try to get current task from various sources
    if [ -z "$task" ]; then
        # Check if Hermes is running
        if pgrep -f "hermes" > /dev/null 2>&1; then
            task="Hermes active"
        else
            task="idle"
        fi
    fi
    
    curl -s -X POST "$ACP_URL/api/agents/$AGENT_ID/heartbeat" \
      -H "Authorization: Bearer $TOKEN" \
      -d "status=$status" \
      -d "current_task=$task" > /dev/null 2>&1
}

# Main heartbeat loop
while true; do
    send_heartbeat "active"
    sleep 300  # 5 minutes
done
