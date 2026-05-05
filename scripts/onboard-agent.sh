#!/bin/bash
# Agent Onboarding — Pulse API v1
# Usage: curl -sSL http://46.225.101.15/onboard.sh | bash
#    Or: ./onboard-agent.sh "AgentName" "model" "provider"

set -e

DASHBOARD_URL="${DASHBOARD_URL:-http://46.225.101.15}"
PULSE_KEY="${PULSE_KEY:-809e2b22a0fd4e0d8dce278295747a5c}"
AGENT_NAME="${1:-$(hostname)}"
AGENT_MODEL="${2:-unknown}"
AGENT_PROVIDER="${3:-unknown}"
AGENT_PROJECT="${4:-default}"

echo "🔌 Onboarding agent: $AGENT_NAME"
echo "   Dashboard: $DASHBOARD_URL"
echo "   Model: $AGENT_MODEL / $AGENT_PROVIDER"
echo ""

# 1. Test connection
echo "[1/2] Testing connection..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-Pulse-Key: $PULSE_KEY" \
  "$DASHBOARD_URL/api/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Dashboard unreachable (HTTP $HTTP_CODE)"
    echo "   Check: DASHBOARD_URL and PULSE_KEY"
    exit 1
fi
echo "✓ Dashboard online"

# 2. Send first pulse (registration)
echo "[2/2] Registering agent..."
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-Pulse-Key: $PULSE_KEY" \
  -d "{
    \"agent\": \"$AGENT_NAME\",
    \"model\": \"$AGENT_MODEL\",
    \"provider\": \"$AGENT_PROVIDER\",
    \"current_project\": \"$AGENT_PROJECT\",
    \"current_task\": \"onboarding\",
    \"activity\": \"Agent registered and online\"
  }" \
  "$DASHBOARD_URL/api/pulse" 2>/dev/null || echo "{}")

# Save config
mkdir -p ~/.hermes/acp
cat > ~/.hermes/acp/pulse.env << EOF
DASHBOARD_URL=$DASHBOARD_URL
PULSE_KEY=$PULSE_KEY
AGENT_NAME=$AGENT_NAME
AGENT_MODEL=$AGENT_MODEL
AGENT_PROVIDER=$AGENT_PROVIDER
EOF

echo "✅ Agent onboarded!"
echo ""
echo "📡 To report activity:"
echo "   curl -X POST $DASHBOARD_URL/api/pulse \\"
echo "     -H 'X-Pulse-Key: $PULSE_KEY' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"agent\":\"$AGENT_NAME\",\"activity\":\"doing X\",\"current_task\":\"task name\"}'"
echo ""
echo "🖥️  Dashboard: $DASHBOARD_URL"
