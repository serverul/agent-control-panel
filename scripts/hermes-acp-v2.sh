#!/bin/bash
# Hermes ACP Integration - Fixed
# Auto-detects model/provider from Hermes config and maintains live heartbeat

set -e

ACP_URL="http://46.225.101.15:3102"
ACP_USER="admin"
ACP_PASS="admin123"
AGENT_NAME="Zeus"
AGENT_TYPE="hermes"

echo "🔌 Hermes ACP Integration"
echo "========================"

# Get Hermes info from config
HERMES_MODEL=""
HERMES_PROVIDER=""
if [ -f "$HOME/.hermes/config.yaml" ]; then
    HERMES_MODEL=$(grep -E "^  model:" ~/.hermes/config.yaml | head -1 | awk '{print $2}' | tr -d '"' || echo "")
    HERMES_PROVIDER=$(grep -E "^  provider:" ~/.hermes/config.yaml | head -1 | awk '{print $2}' | tr -d '"' || echo "")
fi

echo "Agent: $AGENT_NAME"
echo "Type: $AGENT_TYPE"
echo "Model: ${HERMES_MODEL:-unknown}"
echo "Provider: ${HERMES_PROVIDER:-unknown}"
echo ""

# Step 1: Login
echo "[1/3] Logging in to ACP..."
TOKEN=$(curl -s -X POST "$ACP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ACP_USER\",\"password\":\"$ACP_PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
    echo "❌ ERROR: Cannot login to ACP at $ACP_URL"
    exit 1
fi
echo "✓ Logged in"

# Step 2: Onboard agent (upsert)
echo "[2/3] Registering agent..."
ONBOARD_RESPONSE=$(curl -s -X POST "$ACP_URL/api/onboard" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\":\"$AGENT_NAME\",
    \"type\":\"$AGENT_TYPE\",
    \"model\":\"$HERMES_MODEL\",
    \"provider\":\"$HERMES_PROVIDER\",
    \"hostname\":\"$(hostname)\"
  }")

AGENT_ID=$(echo "$ONBOARD_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('agent_id',''))" 2>/dev/null || echo "")

if [ -z "$AGENT_ID" ]; then
    echo "❌ ERROR: Failed to register agent"
    echo "$ONBOARD_RESPONSE"
    exit 1
fi
echo "✓ Agent registered: $AGENT_ID"

# Save agent ID for heartbeat
mkdir -p ~/.hermes/acp
echo "$AGENT_ID" > ~/.hermes/acp/agent_id
echo "$TOKEN" > ~/.hermes/acp/token

# Step 3: Start heartbeat in background (proper daemon)
echo "[3/3] Starting heartbeat..."

# Kill any existing heartbeat for this agent
pkill -f "acp-heartbeat.*$AGENT_ID" 2>/dev/null || true

# Create heartbeat script
cat > ~/.hermes/acp/heartbeat.sh << EOF
#!/bin/bash
AGENT_ID="$AGENT_ID"
TOKEN="$TOKEN"
ACP_URL="$ACP_URL"

while true; do
    STATUS="active"
    CURRENT_TASK="\$(cat ~/.hermes/acp/current_task 2>/dev/null || echo 'Idle')"
    CURRENT_PROJECT="\$(cat ~/.hermes/acp/current_project 2>/dev/null || echo '')"
    
    # Check if Hermes process is running
    if ! pgrep -f "hermes" > /dev/null 2>&1; then
        STATUS="idle"
    fi
    
    curl -s -X POST "\$ACP_URL/api/agents/\$AGENT_ID/heartbeat" \\
      -H "Authorization: Bearer \$TOKEN" \\
      -H "Content-Type: application/json" \\
      -d "{\\"status\\":\\"\$STATUS\\",\\"current_task\\":\\"\$CURRENT_TASK\\",\\"current_project\\":\\"\$CURRENT_PROJECT\\"}" > /dev/null 2>&1
    
    # Also update agent fields
    curl -s -X PUT "\$ACP_URL/api/agents/\$AGENT_ID" \\
      -H "Authorization: Bearer \$TOKEN" \\
      -H "Content-Type: application/json" \\
      -d "{\\"current_task\\":\\"\$CURRENT_TASK\\"}" > /dev/null 2>&1
    
    sleep 60
done
EOF
chmod +x ~/.hermes/acp/heartbeat.sh

# Run heartbeat in background with nohup
nohup ~/.hermes/acp/heartbeat.sh > ~/.hermes/acp/heartbeat.log 2>&1 &
HEARTBEAT_PID=$!
echo "$HEARTBEAT_PID" > ~/.hermes/acp/heartbeat.pid

echo ""
echo "✅ Hermes connected to ACP!"
echo "  Dashboard: http://46.225.101.15:3103"
echo "  Agent ID: $AGENT_ID"
echo "  Heartbeat PID: $HEARTBEAT_PID (every 60s)"
echo ""
echo "To report current task: echo 'Your task' > ~/.hermes/acp/current_task"
echo "To report current project: echo 'Project X' > ~/.hermes/acp/current_project"
echo "To stop heartbeat: kill $HEARTBEAT_PID"
