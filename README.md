# Agent Control Panel (ACP)

Centralized dashboard for managing AI agents, cron jobs, projects, shared context, and real-time cross-agent awareness.

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

- **Dashboard** — see all your agents at a glance, with real-time pulse status
- **Agent Detail** — deep dive into each agent (config, memory, cron jobs, activity log)
- **Cron Jobs** — manage all cron jobs across all agents, with history
- **Projects** — track projects, assign agents, monitor progress
- **Chat** — agent-to-agent and user-to-agent messaging with shared context
- **Stats** — token usage, cost tracking, request volume
- **Connect** — onboarding page for agents (plain text + HTML)
- **Shared Context** — agents share memory, awareness, and project state
- **Real-time Updates** — WebSocket for live dashboard updates
- **Activity Log** — audit trail of everything agents do

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
|---------|--------|------------|
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

### Self-Register via API (Recommended)

Any agent can register itself:

```bash
curl -X POST http://YOUR_SERVER:3100/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "type": "worker",
    "capabilities": ["text", "code"],
    "version": "1.0.0"
  }'
```

Response:
```json
{
  "id": "uuid-here",
  "token": "agent-secret-token",
  "name": "my-agent",
  "type": "worker",
  "status": "active"
}
```

### Send Pulse (Heartbeat)

```bash
curl -X POST http://YOUR_SERVER:3100/api/agents/pulse \
  -H "Content-Type: application/json" \
  -H "X-Agent-Token: YOUR_TOKEN" \
  -d '{
    "agent_id": "YOUR_AGENT_ID",
    "status": "idle",
    "current_project": null
  }'
```

### Agent Install Script

Give this to any agent to self-register:

```bash
# Fetch onboarding instructions
curl http://YOUR_SERVER:3100/install
```

Or use the provided scripts in `scripts/`:

| Script | Purpose |
|--------|---------|
| `acp-onboard.sh` | Interactive onboarding with token persistence |
| `hermes-acp-v3.sh` | Full Hermes integration (onboard + heartbeat + chat) |
| `onboard-agent.sh` | Simple one-shot onboarding |
| `report-pulse.sh` | Standalone heartbeat sender |
| `acp_agent.py` | Python client library |

### Hermes Agent Integration

For Hermes agents, copy `scripts/hermes-acp-v3.sh` and configure:

```bash
export ACP_URL="http://YOUR_SERVER:3100"
export ACP_AGENT_NAME="hermes-prod"
export ACP_AGENT_TYPE="hermes"
export ACP_CAPABILITIES='["text","code","web_search"]'

# Onboard (run once)
./scripts/hermes-acp-v3.sh

# Heartbeat runs automatically via cron/systemd
```

## API Reference

Full API documentation available at:
```
http://localhost:3100/docs
```

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Get JWT token (web UI) |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/agents` | List all agents |
| `POST` | `/api/agents` | Self-register new agent |
| `GET` | `/api/agents/{id}` | Get agent details |
| `PUT` | `/api/agents/{id}` | Update agent config |
| `DELETE` | `/api/agents/{id}` | Remove agent |
| `POST` | `/api/agents/pulse` | Agent heartbeat (X-Agent-Token) |

### Cron Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cron-jobs` | List all cron jobs |
| `POST` | `/api/cron-jobs` | Create cron job |
| `GET` | `/api/cron-jobs/{id}` | Get job details |
| `PUT` | `/api/cron-jobs/{id}` | Update job |
| `DELETE` | `/api/cron-jobs/{id}` | Delete job |
| `POST` | `/api/cron-jobs/{id}/run` | Trigger job now |
| `GET` | `/api/cron-jobs/{id}/history` | Get execution history |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/{id}` | Get project details |
| `PUT` | `/api/projects/{id}` | Update project |
| `DELETE` | `/api/projects/{id}` | Delete project |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/chat/channels` | List channels |
| `POST` | `/api/chat/channels` | Create channel |
| `GET` | `/api/chat/channels/{id}/messages` | Get messages |
| `POST` | `/api/chat/channels/{id}/messages` | Send message |

### Shared Context

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/shared` | Get shared memory/context |
| `POST` | `/api/shared` | Write to shared context |

### Activity Log

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/activity` | List activity logs |
| `POST` | `/api/activity` | Log activity |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats/overview` | Global stats |

### WebSocket

| URL | Description |
|-----|-------------|
| `ws://YOUR_SERVER:3100/ws` | Real-time updates for dashboard |

### Install Endpoint (Agent Onboarding)

| URL | Description |
|-----|-------------|
| `GET /install` | Plain text onboarding instructions |
| `GET /connect` | HTML onboarding page |

## Project Structure

```
agent-control-panel/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   ├── activity.py    # Activity log endpoints
│   │   │   ├── agents.py      # Agent CRUD + pulse
│   │   │   ├── auth.py        # JWT authentication
│   │   │   ├── chat.py        # Chat channels + messages
│   │   │   ├── cron_jobs.py   # Cron job management
│   │   │   ├── onboard.py     # Agent self-registration
│   │   │   ├── projects.py    # Project management
│   │   │   ├── shared.py      # Shared context/memory
│   │   │   ├── spec.py        # Spec endpoint
│   │   │   ├── stats.py       # Statistics
│   │   │   └── websocket.py   # WebSocket handler
│   │   ├── core/         # Config, DB, Auth
│   │   ├── models/       # SQLAlchemy models
│   │   │   ├── activity_log.py
│   │   │   ├── agent.py
│   │   │   ├── agent_project.py
│   │   │   ├── chat.py
│   │   │   ├── cron_job.py
│   │   │   └── project.py
│   │   └── main.py       # App entry
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   │   ├── AgentDetail.tsx
│   │   │   ├── Chat.tsx
│   │   │   ├── Connect.tsx
│   │   │   ├── CronJobs.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Projects.tsx
│   │   │   └── Stats.tsx
│   │   ├── lib/          # Utilities, API client
│   │   └── styles/
│   ├── Dockerfile
│   └── package.json
├── scripts/              # Agent integration scripts
│   ├── acp-onboard.sh
│   ├── hermes-acp-v3.sh
│   ├── onboard-agent.sh
│   ├── report-pulse.sh
│   └── acp_agent.py
├── docker-compose.yml
├── install.sh            # One-click install
├── SPEC.md               # Full specification
└── README.md             # This file
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
npm run dew
```

## Features Implemented

- [x] Agent CRUD with self-registration
- [x] Dashboard with real-time agent status
- [x] Agent Detail (config, memory, cron jobs, activity log)
- [x] Cron Jobs manager with history
- [x] Projects view with agent assignment
- [x] Chat system (agent-to-agent + user-to-agent)
- [x] Stats & analytics with charts
- [x] WebSocket real-time updates
- [x] Config editor per agent
- [x] Shared memory pool
- [x] Activity log (audit trail)
- [x] Agent awareness API
- [x] Plain text `/install` endpoint for agent onboarding
- [x] HTML `/connect` page for human onboarding
- [x] Agent install scripts (bash + python)
- [x] JWT authentication
- [x] API key protection for agent endpoints

## License

MIT

## Author

Built by [Vlad/Benedict](https://github.com/serverul) for managing AI agent infrastructure.
