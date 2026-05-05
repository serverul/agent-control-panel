#!/bin/bash
# Report pulse from agent session to dashboard API
# Usage: ./report-pulse.sh <agent_id> [activity] [model] [provider] [task] [project]
# Example: ./report-pulse.sh clawdiu "deploying backend" "kimi-k2.6" "opencode-go"

AGENT_ID="${1:-clawdiu}"
ACTIVITY="${2:-}"
MODEL="${3:-}"
PROVIDER="${4:-}"
TASK="${5:-}"
PROJECT="${6:-}"

API_URL="http://localhost:3100/api/agents/${AGENT_ID}/pulse"

# Build JSON payload
JSON='{'
[ -n "$MODEL" ] && JSON="${JSON}\"model\": \"$MODEL\","
[ -n "$PROVIDER" ] && JSON="${JSON}\"provider\": \"$PROVIDER\","
[ -n "$TASK" ] && JSON="${JSON}\"current_task\": \"$TASK\","
[ -n "$PROJECT" ] && JSON="${JSON}\"current_project\": \"$PROJECT\","
[ -n "$ACTIVITY" ] && JSON="${JSON}\"activity\": \"$ACTIVITY\","
# Remove trailing comma if present
JSON="${JSON%,}"
JSON="${JSON}}"

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$JSON" 2>/dev/null
