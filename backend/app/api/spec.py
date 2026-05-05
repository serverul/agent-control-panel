"""
ACP Connection Spec — Returns machine-readable connection instructions.
Any agent can call this to discover how to connect to this ACP instance.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/spec", tags=["spec"])

class EndpointInfo(BaseModel):
    path: str
    method: str
    description: str
    auth_required: bool
    payload_example: Optional[dict] = None

class ConnectionSpec(BaseModel):
    name: str
    version: str
    description: str
    base_url: str
    websocket_url: str
    endpoints: List[EndpointInfo]
    onboarding: dict
    heartbeat_interval_seconds: int
    notes: str

@router.get("/", response_model=ConnectionSpec)
async def get_spec():
    """
    Return the full connection specification for this ACP instance.
    Any agent can call this to auto-discover how to connect.
    """
    return ConnectionSpec(
        name="Agent Control Panel",
        version="0.2.0",
        description="Universal agent monitoring and orchestration dashboard. Works with any AI agent framework.",
        base_url="/api",
        websocket_url="/ws",
        endpoints=[
            EndpointInfo(
                path="/onboard",
                method="POST",
                description="Self-register a new agent. No auth required. Returns agent_id, heartbeat_url, dashboard_url.",
                auth_required=False,
                payload_example={
                    "name": "My Agent",
                    "type": "custom",
                    "model": "claude-sonnet-4",
                    "provider": "anthropic",
                    "capabilities": ["coding", "research"]
                }
            ),
            EndpointInfo(
                path="/agents/{agent_id}/heartbeat",
                method="POST",
                description="Keep-alive ping. Call every 30-60 seconds. Requires JWT auth (dashboard login) OR no auth if ACP is open.",
                auth_required=False,
                payload_example={}
            ),
            EndpointInfo(
                path="/agents/{agent_id}/pulse",
                method="POST",
                description="Real-time status update from agent session. Updates model, task, activity, etc.",
                auth_required=False,
                payload_example={
                    "activity": "debugging auth module",
                    "model": "claude-sonnet-4",
                    "provider": "anthropic",
                    "current_task": "Fix login bug",
                    "current_project": "my-project",
                    "status": "active"
                }
            ),
            EndpointInfo(
                path="/agents/{agent_id}/query",
                method="POST",
                description="Send a query/request to an agent. Agent polls query-result to respond.",
                auth_required=True,
                payload_example={"query": "Please review the auth code"}
            ),
            EndpointInfo(
                path="/agents/{agent_id}/query-result",
                method="GET",
                description="Poll for agent's response to a query.",
                auth_required=True
            ),
            EndpointInfo(
                path="/agents",
                method="GET",
                description="List all connected agents. Requires auth.",
                auth_required=True
            ),
            EndpointInfo(
                path="/agents/{agent_id}",
                method="GET",
                description="Get agent details. Requires auth.",
                auth_required=True
            ),
            EndpointInfo(
                path="/agents/{agent_id}/activity",
                method="GET",
                description="Get agent activity log. Requires auth.",
                auth_required=True
            ),
        ],
        onboarding={
            "steps": [
                "Call POST /api/onboard with your agent name, type, model, and provider.",
                "Store the returned agent_id securely.",
                "Start a heartbeat loop: POST /api/agents/{agent_id}/heartbeat every 30-60s.",
                "Send real-time updates via POST /api/agents/{agent_id}/pulse whenever status changes.",
                "Optional: Connect to WebSocket /ws for real-time broadcast updates.",
                "Optional: Connect to /ws/agents/{agent_id} for agent-specific streaming."
            ],
            "one_liner": "curl -X POST /api/onboard -H 'Content-Type: application/json' -d '{\"name\":\"MyAgent\",\"type\":\"custom\"}'",
            "language_examples": ["shell", "python", "nodejs"]
        },
        heartbeat_interval_seconds=60,
        notes="This ACP instance accepts self-onboarding. No pre-registration needed. Agents discover capabilities by calling this /spec endpoint. The /pulse endpoint is the primary mechanism for real-time updates. Heartbeat is secondary keep-alive."
    )
