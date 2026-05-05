"""
WebSocket manager for real-time agent updates.
Supports agent-specific rooms and global broadcast.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional
import json
import asyncio

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Global connections (dashboard viewers)
        self.global_connections: List[WebSocket] = []
        # Agent-specific rooms: agent_id -> [WebSocket]
        self.agent_rooms: Dict[str, List[WebSocket]] = {}
        # Track which agents each connection is subscribed to
        self.connection_subs: Dict[WebSocket, set] = {}

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_connections.append(websocket)
        self.connection_subs[websocket] = set()

    async def connect_agent(self, websocket: WebSocket, agent_id: str):
        await websocket.accept()
        if agent_id not in self.agent_rooms:
            self.agent_rooms[agent_id] = []
        self.agent_rooms[agent_id].append(websocket)
        self.connection_subs[websocket] = {agent_id}

    def disconnect(self, websocket: WebSocket):
        if websocket in self.global_connections:
            self.global_connections.remove(websocket)
        for agent_id, connections in list(self.agent_rooms.items()):
            if websocket in connections:
                connections.remove(websocket)
                if not connections:
                    del self.agent_rooms[agent_id]
        if websocket in self.connection_subs:
            del self.connection_subs[websocket]

    async def broadcast_global(self, message: dict):
        """Broadcast to all dashboard viewers."""
        dead = []
        for conn in self.global_connections:
            try:
                await conn.send_text(json.dumps(message))
            except Exception:
                dead.append(conn)
        for conn in dead:
            self.disconnect(conn)

    async def broadcast_to_agent(self, agent_id: str, message: dict):
        """Broadcast to a specific agent's room + global viewers."""
        payload = json.dumps(message)
        dead = []

        # Send to agent-specific listeners
        if agent_id in self.agent_rooms:
            for conn in self.agent_rooms[agent_id]:
                try:
                    await conn.send_text(payload)
                except Exception:
                    dead.append(conn)

        # Send to global connections that are subscribed to this agent or all
        for conn in self.global_connections:
            subs = self.connection_subs.get(conn, set())
            if not subs or agent_id in subs:  # no subs = all, or specific sub
                try:
                    await conn.send_text(payload)
                except Exception:
                    dead.append(conn)

        for conn in dead:
            self.disconnect(conn)

manager = ConnectionManager()

# ─── WebSocket Endpoints ──────────────────────────────────────────────

@router.websocket("/ws")
async def websocket_global(websocket: WebSocket):
    """Dashboard global feed — receives all agent updates."""
    await manager.connect_global(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            # Support subscribing to specific agents
            if msg.get("action") == "subscribe" and msg.get("agent_id"):
                manager.connection_subs[websocket].add(msg["agent_id"])
            elif msg.get("action") == "unsubscribe" and msg.get("agent_id"):
                manager.connection_subs[websocket].discard(msg["agent_id"])
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@router.websocket("/ws/agents/{agent_id}")
async def websocket_agent(websocket: WebSocket, agent_id: str):
    """Agent-specific room — for agents streaming their own data."""
    await manager.connect_agent(websocket, agent_id)
    try:
        while True:
            # Agents can send real-time data here too
            data = await websocket.receive_text()
            msg = json.loads(data)
            # Echo to the agent's room
            await manager.broadcast_to_agent(agent_id, {
                "type": "agent_message",
                "agent_id": agent_id,
                "data": msg
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
