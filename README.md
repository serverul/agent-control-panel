# Agent Control Panel (ACP)

Centralized dashboard for managing AI agents, cron jobs, projects, and cross-agent awareness.

![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.12+-green)
![React](https://img.shields.io/badge/react-19-blue)

## Quick Start (One Command)

```bash
curl -sSL https://raw.githubusercontent.com/serverul/agent-control-panel/main/install.sh | bash
```

That's it. The script will:
- Install Docker if needed
- Clone the repo
- Start all services
- Print the URL and credentials

## What You Get

- **Dashboard** — see all your agents at a glance
- **Agent Detail** — deep dive into each agent (config, cron jobs, memory, stats)
- **Cron Jobs** — manage all cron jobs across all agents
- **Projects** — track projects (HartaGIS, Legal AI, etc.)
- **Chat** — agent-to-agent and user-to-agent messaging
- **Stats** — token usage, cost tracking, request volume

## Screenshots

> Dark theme with Obsidian + glassmorphism aesthetic

## Manual Installation

### Prerequisites

- Docker + Docker Compose
- Git
- 512MB RAM minimum

### Steps

```bash
# 1. Clone
git clone https://github.com/serverul/agent-control-panel.git
cd agent-control-panel

# 2. Configure (optional)
cp .env.example .env
# Edit .env if you want to change ports, password, etc.

# 3. Start
docker compose up -d

# 4. Open
# http://localhost:3101
# Login: admin / admin123
```

### Without Docker

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 3100

# Frontend
cd frontend
npm install
npm run dev
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ACP_PORT` | `3101` | Frontend port |
| `ACP_API_PORT` | `3100` | Backend API port |
| `ACP_DB_PORT` | `5433` | PostgreSQL port |
| `ACP_ADMIN_USER` | `admin` | Default username |
| `ACP_ADMIN_PASS` | `admin123` | Default password |
| `ACP_SECRET_KEY` | (random) | JWT secret key |

### Default Credentials

- **URL:** http://localhost:3101
- **Username:** `admin`
- **Password:** `admin123`

> Change the password after first login!

## Connecting Agents

### Hermes Agent

Add this to your Hermes config or run as a cron job:

```python
import requests
import json

ACP_URL = "http://YOUR_SERVER:3100"
AGENT_ID = "hermes-001"

# Login
token = requests.post(f"{ACP_URL}/api/auth/login", json={
    "username": "admin",
    "password": "admin123"
}).json()["access_token"]

headers = {"Authorization": f"Bearer {token}"}

# Register agent
requests.post(f"{ACP_URL}/api/agents", headers=headers, json={
    "id": AGENT_ID,
    "name": "Hermes",
    "type": "hermes",
    "model": "claude-sonnet-4",
    "provider": "anthropic"
})

# Heartbeat (run every 5 minutes)
requests.post(f"{ACP_URL}/api/agents/{AGENT_ID}/heartbeat", 
    params={"status": "active", "current_task": "Processing user request"})
```

### OpenClaw Agent

Same pattern — register with a unique ID and send heartbeats.

## API Reference

Full API documentation available at:
```
http://localhost:3100/docs
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Get JWT token |
| `GET` | `/api/agents` | List all agents |
| `POST` | `/api/agents` | Register agent |
| `POST` | `/api/agents/{id}/heartbeat` | Agent heartbeat |
| `GET` | `/api/cron-jobs` | List cron jobs |
| `GET` | `/api/projects` | List projects |
| `GET` | `/api/chat/channels` | List chat channels |
| `GET` | `/api/stats/overview` | Global stats |

## Agent Install Script

Give this to any agent to self-register:

```bash
#!/bin/bash
# agent-install.sh — Run this on the agent's machine

ACP_URL="http://YOUR_SERVER:3100"
AGENT_ID="${1:-$(hostname)}"
AGENT_NAME="${2:-$(hostname)}"
AGENT_TYPE="${3:-custom}"

# Login
TOKEN=$(curl -s -X POST "$ACP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.access_token')

# Register
curl -s -X POST "$ACP_URL/api/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$AGENT_ID\",\"name\":\"$AGENT_NAME\",\"type\":\"$AGENT_TYPE\"}"

# Heartbeat loop
while true; do
  curl -s -X POST "$ACP_URL/api/agents/$AGENT_ID/heartbeat" \
    -H "Authorization: Bearer $TOKEN" \
    -d "status=active"
  sleep 300  # 5 minutes
done
```

## Project Structure

```
agent-control-panel/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/       # API routes
│   │   ├── core/      # Config, DB, Auth
│   │   ├── models/    # SQLAlchemy models
│   │   └── main.py    # App entry
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   └── styles/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── install.sh         # One-click install
└── SPEC.md            # Full specification
```

## Development

```bash
# Backend (hot reload)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 3100

# Frontend (hot reload)
cd frontend
npm install
npm run dev
```

## Roadmap

- [x] MVP: Agent CRUD, Dashboard, Auth
- [ ] Cron Jobs manager (full)
- [ ] Projects view (full)
- [ ] Chat system (agent-to-agent + user-to-agent)
- [ ] Stats & analytics with charts
- [ ] WebSocket real-time updates
- [ ] Config editor
- [ ] Shared memory pool
- [ ] Agent awareness API

## License

MIT

## Author

Built by [Vlad/Benedict](https://github.com/serverul) for managing AI agent infrastructure.
