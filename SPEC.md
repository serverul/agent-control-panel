# Agent Control Panel — Spec

## Overview
Centralized dashboard for managing multiple AI agents (Hermes, OpenClaw, etc.), their cron jobs, projects, stats, and cross-agent awareness.

## Problem
Multiple agents running independently with no unified view. Hard to track:
- What each agent is doing right now
- Which cron jobs are active/failed
- Token/cost usage per agent
- Project status across agents
- Agent-to-agent memory and coordination

## Users
- **Vlad/Benedict** — primary user, developer, manages all agents
- Future: team members who need visibility into agent activity

## Tech Stack
- **Backend:** FastAPI (Python)
- **Frontend:** React + TailwindCSS + shadcn/ui
- **Database:** PostgreSQL (shared with HartaGIS or standalone)
- **Real-time:** WebSocket for live agent status
- **Auth:** Simple JWT (single user initially)
- **Deployment:** Docker on Hetzner (46.225.101.15)
- **Agent Integration:** REST API + WebSocket per agent

---

## Features

### 1. Agent Dashboard (Home)
Real-time overview of all connected agents.

**Cards per agent:**
- Agent name (Hermes, OpenClaw, etc.)
- Status: 🟢 active / 🟡 idle / 🔴 error / ⚫ offline
- Current task (what it's doing right now)
- Model in use (e.g., mimo-v2.5-pro, claude-sonnet-4)
- Last activity timestamp
- Quick actions: restart, pause, send message

**Global stats bar:**
- Total agents online
- Active cron jobs
- Tokens used today / this month
- Estimated cost

### 2. Cron Jobs Manager
View and manage all cron jobs across all agents.

**Table view:**
| Agent | Job Name | Schedule | Last Run | Status | Actions |
|-------|----------|----------|----------|--------|---------|

**Features:**
- Filter by agent, status, schedule
- Run job manually
- Pause/resume
- View run history (last 10 runs with output)
- Edit schedule (inline)
- Create new job

### 3. Agent Detail Page
Deep dive into a single agent.

**Tabs:**
- **Overview:** status, model, config, uptime
- **Activity:** real-time log stream (WebSocket)
- **Cron Jobs:** jobs specific to this agent
- **Memory:** view/edit agent memory entries
- **Config:** model, provider, tools, skills
- **Stats:** tokens, cost, requests over time

### 4. Projects View
Track projects across agents.

**Project card:**
- Project name (HartaGIS, Legal AI, Momclaw, etc.)
- Status: active / paused / completed
- Related agents
- Recent activity
- Next milestones

**Features:**
- Link agents to projects
- Track tasks per project
- View project-specific cron jobs
- Notes/description

### 5. Stats & Analytics
Usage tracking and cost estimation.

**Charts:**
- Token usage per agent (daily/weekly/monthly)
- Cost breakdown per agent/model
- Cron job success/failure rate
- Request volume over time

**Tables:**
- Model usage breakdown
- Top cron jobs by cost
- Error log

### 6. Agent Awareness (Cross-Agent)
Agents can see each other's state.

**Shared context:**
- Agent registry (what agents exist, what they do)
- Shared memory pool (optional)
- Message bus (agent-to-agent messages)
- Project context (all agents see project status)

**API endpoints:**
- `GET /api/agents` — list all agents
- `GET /api/agents/{id}/status` — agent status
- `GET /api/agents/{id}/memory` — agent memory
- `POST /api/agents/{id}/message` — send message to agent
- `GET /api/shared/context` — shared context for all agents

### 7. Configuration
Manage agent settings from the dashboard.

**Per agent:**
- Model provider & model name
- Temperature, max tokens
- Enabled tools
- Enabled skills
- Cron job defaults
- Notification settings (Telegram, Discord)

---

## Data Models

### Agent
```python
class Agent(BaseModel):
    id: str  # unique identifier
    name: str  # "Hermes", "OpenClaw"
    type: str  # "hermes", "openclaw", "custom"
    status: Literal["active", "idle", "error", "offline"]
    model: str  # "mimo-v2.5-pro"
    provider: str  # "xiaomi", "openrouter"
    current_task: Optional[str]
    last_activity: datetime
    config: dict  # model config, tools, skills
    created_at: datetime
```

### CronJob
```python
class CronJob(BaseModel):
    id: str
    agent_id: str
    name: str
    schedule: str  # cron expression
    prompt: str
    enabled: bool
    last_run: Optional[datetime]
    last_status: Optional[Literal["ok", "error", "running"]]
    run_history: list[RunRecord]
```

### Project
```python
class Project(BaseModel):
    id: str
    name: str  # "HartaGIS Pro", "Legal AI MVP"
    status: Literal["active", "paused", "completed", "planned"]
    description: str
    agents: list[str]  # agent IDs
    milestones: list[Milestone]
    notes: str
    created_at: datetime
```

### AgentMemory
```python
class AgentMemory(BaseModel):
    agent_id: str
    entries: list[MemoryEntry]
    shared_entries: list[MemoryEntry]  # visible to all agents
```

### Stats
```python
class Stats(BaseModel):
    agent_id: str
    date: date
    tokens_input: int
    tokens_output: int
    requests: int
    cost_usd: float
    model: str
```

---

## API Endpoints

### Agents
- `GET /api/agents` — list all agents
- `GET /api/agents/{id}` — agent detail
- `GET /api/agents/{id}/status` — real-time status
- `POST /api/agents/{id}/restart` — restart agent
- `POST /api/agents/{id}/message` — send message
- `GET /api/agents/{id}/memory` — view memory
- `PUT /api/agents/{id}/memory` — update memory
- `GET /api/agents/{id}/config` — view config
- `PUT /api/agents/{id}/config` — update config
- `GET /api/agents/{id}/stats` — usage stats

### Cron Jobs
- `GET /api/cron-jobs` — list all (filterable by agent)
- `GET /api/cron-jobs/{id}` — job detail
- `POST /api/cron-jobs/{id}/run` — run manually
- `POST /api/cron-jobs/{id}/pause` — pause
- `POST /api/cron-jobs/{id}/resume` — resume
- `GET /api/cron-jobs/{id}/history` — run history
- `PUT /api/cron-jobs/{id}` — update schedule/prompt

### Projects
- `GET /api/projects` — list all
- `POST /api/projects` — create
- `GET /api/projects/{id}` — detail
- `PUT /api/projects/{id}` — update
- `GET /api/projects/{id}/activity` — recent activity

### Stats
- `GET /api/stats/overview` — global stats
- `GET /api/stats/agents` — per-agent stats
- `GET /api/stats/costs` — cost breakdown
- `GET /api/stats/timeline` — usage over time

### Shared Context
- `GET /api/shared/context` — shared context for agents
- `POST /api/shared/message` — agent-to-agent message
- `GET /api/shared/memory` — shared memory pool

### WebSocket
- `WS /ws/agents` — real-time agent status updates
- `WS /ws/agents/{id}/logs` — agent log stream

---

## Agent Integration

Each agent needs a lightweight client that reports to the Control Panel.

### Hermes Integration
- Hermes already has `~/.hermes/config.yaml` and cron job API
- Client: periodic heartbeat + status report via REST
- Reads: config, memory, cron jobs, stats
- Writes: status updates, log entries

### OpenClaw Integration
- Similar pattern — client reads OpenClaw state
- Reports to Control Panel API

### Agent Awareness
- Shared context endpoint: `/api/shared/context`
- Each agent can query: what other agents exist, their status, shared memory
- Optional: message bus for agent-to-agent communication

---

## Deployment

- Docker Compose on Hetzner (46.225.101.15)
- Port: 3100 (or similar, avoid conflicts with HartaGIS 3000, Ghost 2368)
- Nginx reverse proxy
- PostgreSQL database
- WebSocket support in Nginx

---

## MVP Scope (Phase 1)

**Week 1-2:**
- [ ] Backend: FastAPI + PostgreSQL
- [ ] Agent model + CRUD
- [ ] Cron job model + CRUD (read from Hermes API)
- [ ] Basic dashboard (React + Tailwind)
- [ ] Agent cards with status
- [ ] Cron job table

**Week 3-4:**
- [ ] Real-time status via WebSocket
- [ ] Agent detail page
- [ ] Stats overview
- [ ] Projects view
- [ ] Memory viewer

**Phase 2:**
- [ ] Agent-to-agent awareness
- [ ] Shared memory pool
- [ ] Config editor
- [ ] Cost tracking
- [ ] Charts/analytics

---

## Open Questions
1. Should we use the same PostgreSQL as HartaGIS or separate?
2. How often should agents report status? (heartbeat interval)
3. Do we want agent-to-agent chat or just shared context?
4. Auth: single user or multi-user?
5. Should agents be able to modify each other's config?
