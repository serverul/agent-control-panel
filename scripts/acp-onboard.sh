#!/bin/bash
# =============================================================================
# ACP Universal Onboarding Script
# Connect ANY agent framework to the Agent Control Panel
# =============================================================================
# Usage: ./acp-onboard.sh [OPTIONS]
#
# Options:
#   --url <URL>        ACP base URL (default: auto-detect or http://localhost:3100)
#   --name <NAME>      Agent name (default: hostname)
#   --type <TYPE>      Agent type: hermes, opencode, codex, claude, custom (default: custom)
#   --model <MODEL>    Model being used, e.g. "claude-sonnet-4", "gpt-4" (default: "")
#   --provider <P>     Provider: anthropic, openai, openrouter, local (default: "")
#   --heartbeat <SEC>  Heartbeat interval in seconds (default: 60)
#   --daemon           Run heartbeat in background (default: foreground)
#   --help             Show this help
#
# Examples:
#   ./acp-onboard.sh --url http://acp.example.com --name "MyBot" --type opencode
#   ./acp-onboard.sh --name "Hermes-Prod" --type hermes --model "kimi-k2.6" --provider "opencode-go"
#   ./acp-onboard.sh --url http://100.68.23.69:3104 --daemon
# =============================================================================

set -e

# ─── Defaults ─────────────────────────────────────────────────────────────────
ACP_URL=""
AGENT_NAME=""
AGENT_TYPE="custom"
AGENT_MODEL=""
AGENT_PROVIDER=""
HEARTBEAT_INTERVAL=60
DAEMON_MODE=false

# ─── Parse args ─────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --url)
      ACP_URL="$2"
      shift 2
      ;;
    --name)
      AGENT_NAME="$2"
      shift 2
      ;;
    --type)
      AGENT_TYPE="$2"
      shift 2
      ;;
    --model)
      AGENT_MODEL="$2"
      shift 2
      ;;
    --provider)
      AGENT_PROVIDER="$2"
      shift 2
      ;;
    --heartbeat)
      HEARTBEAT_INTERVAL="$2"
      shift 2
      ;;
    --daemon)
      DAEMON_MODE=true
      shift
      ;;
    --help)
      echo "ACP Universal Onboarding Script"
      echo ""
      echo "Connect any AI agent framework to the Agent Control Panel."
      echo ""
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --url <URL>        ACP base URL (default: auto-detect)"
      echo "  --name <NAME>      Agent display name (default: hostname)"
      echo "  --type <TYPE>      Agent framework: hermes, opencode, codex, claude, custom"
      echo "  --model <MODEL>    AI model name, e.g. claude-sonnet-4, gpt-4, kimi-k2.6"
      echo "  --provider <P>     Provider: anthropic, openai, openrouter, local"
      echo "  --heartbeat <SEC>  Seconds between heartbeats (default: 60)"
      echo "  --daemon           Run heartbeat loop in background"
      echo "  --help             Show this help"
      echo ""
      echo "Examples:"
      echo "  $0 --url http://acp.example.com --name MyBot --type opencode"
      echo "  $0 --name Hermes-Prod --type hermes --model kimi-k2.6 --provider opencode-go"
      echo "  $0 --daemon"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run '$0 --help' for usage."
      exit 1
      ;;
  esac
done

# ─── Auto-detect ACP URL ─────────────────────────────────────────────────────────
if [[ -z "$ACP_URL" ]]; then
  # Check env var
  if [[ -n "$ACP_URL" ]]; then
    ACP_URL="$ACP_URL"
  # Check local Docker
  elif curl -sf http://localhost:3104/api/health >/dev/null 2>&1; then
    ACP_URL="http://localhost:3104"
  elif curl -sf http://localhost:3100/api/health >/dev/null 2>&1; then
    ACP_URL="http://localhost:3100"
  # Check Tailscale
  elif curl -sf http://100.68.23.69:3104/api/health >/dev/null 2>&1; then
    ACP_URL="http://100.68.23.69:3104"
  # Default fallback
  else
    ACP_URL="http://localhost:3104"
  fi
fi

# Strip trailing slash
ACP_URL="${ACP_URL%/}"

# ─── Defaults for name ────────────────────────────────────────────────────────────────
if [[ -z "$AGENT_NAME" ]]; then
  AGENT_NAME="$(hostname)"
fi

# ─── Validate connectivity ──────────────────────────────────────────────────────────
echo "🚀 ACP Universal Onboarding"
echo "   URL:     $ACP_URL"
echo "   Agent:   $AGENT_NAME"
echo "   Type:    $AGENT_TYPE"
echo ""

if ! curl -sf "$ACP_URL/api/health" >/dev/null 2>&1; then
  echo "❌ Error: Cannot reach ACP at $ACP_URL"
  echo "   Is the ACP running? Set --url manually if needed."
  exit 1
fi

echo "✅ ACP is online"

# ─── ONBOARD ───────────────────────────────────────────────────────────────────
echo ""
echo "📡 Step 1: Onboarding..."

ONBOARD_RESP=$(curl -sf -X POST "$ACP_URL/api/onboard" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$AGENT_NAME\",\"type\":\"$AGENT_TYPE\",\"model\":\"$AGENT_MODEL\",\"provider\":\"$AGENT_PROVIDER\"}" 2>&1)

if [[ $? -ne 0 ]] || [[ -z "$ONBOARD_RESP" ]]; then
  echo "❌ Onboarding failed. Response:"
  echo "$ONBOARD_RESP"
  exit 1
fi

# Parse response (using grep/sed for portability — no jq required)
AGENT_ID=$(echo "$ONBOARD_RESP" | grep -o '"agent_id"[^,}]*' | cut -d'"' -f4)
STATUS=$(echo "$ONBOARD_RESP" | grep -o '"status"[^,}]*' | cut -d'"' -f4)

if [[ -z "$AGENT_ID" ]]; then
  echo "❌ Failed to parse agent_id from response:"
  echo "$ONBOARD_RESP"
  exit 1
fi

echo "✅ Onboarded!"
echo "   Agent ID:   $AGENT_ID"
echo "   Status:     $STATUS"

# ─── Save config for later use ─────────────────────────────────────────────────────────
CONFIG_DIR="${HOME}/.acp"
mkdir -p "$CONFIG_DIR"
cat > "$CONFIG_DIR/agent.env" <<EOF
# ACP Agent Configuration
# Generated by acp-onboard.sh on $(date -Iseconds)
ACP_URL=$ACP_URL
AGENT_ID=$AGENT_ID
AGENT_NAME=$AGENT_NAME
AGENT_TYPE=$AGENT_TYPE
AGENT_MODEL=$AGENT_MODEL
AGENT_PROVIDER=$AGENT_PROVIDER
HEARTBEAT_INTERVAL=$HEARTBEAT_INTERVAL
EOF

echo "   Config:     $CONFIG_DIR/agent.env"

# ─── HEARTBEAT FUNCTION ─────────────────────────────────────────────────────────────────────
heartbeat_loop() {
  echo ""
  echo "💓 Step 2: Heartbeat loop (every ${HEARTBEAT_INTERVAL}s)"
  echo "   Press Ctrl+C to stop"
  echo ""

  while true; do
    RESP=$(curl -sf -X POST "$ACP_URL/api/agents/$AGENT_ID/heartbeat" \
      -H "Content-Type: application/json" 2>&1)
    if [[ $? -eq 0 ]]; then
      echo "[✓] $(date '+%H:%M:%S') heartbeat sent"
    else
      echo "[✗] $(date '+%H:%M:%S') heartbeat FAILED"
    fi
    sleep "$HEARTBEAT_INTERVAL"
  done
}

# ─── Run heartbeat ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────────────────────────────────────────"
echo ""
echo "📝 Next steps:"
echo ""
echo "  1. Send pulses (real-time updates):"
echo "     curl -X POST $ACP_URL/api/agents/$AGENT_ID/pulse \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"activity\":\"Working...\",\"model\":\"$AGENT_MODEL\",\"provider\":\"$AGENT_PROVIDER\"}'"
echo ""
echo "  2. View dashboard:"
echo "     $ACP_URL"
echo ""
echo "  3. Load this config in your agent code:"
echo "     source ~/.acp/agent.env"
echo ""

if $DAEMON_MODE; then
  heartbeat_loop > "$CONFIG_DIR/heartbeat.log" 2>&1 &
  HEARTBEAT_PID=$!
  echo "$HEARTBEAT_PID" > "$CONFIG_DIR/heartbeat.pid"
  echo "🐄 Daemon mode: heartbeat running in background (PID: $HEARTBEAT_PID)"
  echo "   Logs: $CONFIG_DIR/heartbeat.log"
  echo "   Stop: kill $(cat $CONFIG_DIR/heartbeat.pid 2>/dev/null)"
else
  heartbeat_loop
fi
