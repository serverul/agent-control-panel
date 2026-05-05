import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Bot, Activity, Clock, DollarSign, Cpu, Wifi, WifiOff, AlertCircle, Pause, FolderKanban } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  model: string;
  provider: string;
  current_task: string | null;
  last_activity: string;
  last_heartbeat: string;
}

interface Overview {
  total_agents: number;
  active_agents: number;
  total_tokens_today: number;
  total_cost_today: number;
  total_requests_today: number;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  active: { color: "bg-status-active", icon: Wifi, label: "Active" },
  idle: { color: "bg-status-idle", icon: Pause, label: "Idle" },
  error: { color: "bg-status-error", icon: AlertCircle, label: "Error" },
  offline: { color: "bg-status-offline", icon: WifiOff, label: "Offline" },
};

function AgentCard({ agent }: { agent: Agent }) {
  const status = statusConfig[agent.status] || statusConfig.offline;
  const StatusIcon = status.icon;
  const timeSince = getTimeSince(agent.last_activity);

  return (
    <Link to={`/agents/${agent.id}`} className="glass glass-hover p-5 block">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-glow flex items-center justify-center">
            <Bot className="w-5 h-5 text-accent-secondary" />
          </div>
          <div>
            <h3 className="font-semibold">{agent.name}</h3>
            <p className="text-xs text-text-muted">{agent.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-dot ${agent.status}`} />
          <span className="text-xs text-text-secondary">{status.label}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Cpu className="w-3.5 h-3.5" />
          <span>{agent.model || "No model"}</span>
          {agent.provider && <span className="text-text-muted">({agent.provider})</span>}
        </div>
        {agent.current_task && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Activity className="w-3.5 h-3.5" />
            <span className="truncate">{agent.current_task}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Clock className="w-3 h-3" />
          <span>Last seen {timeSince}</span>
        </div>
      </div>
    </Link>
  );
}

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchAll = (silent = false) => {
    Promise.all([api.getAgents(), api.getOverview(), api.getProjects()])
      .then(([a, o, p]) => { setAgents(a); setOverview(o); setProjects(p); })
      .catch(console.error)
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => { fetchAll(); }, []);

  // Auto-refresh every 10s for near real-time
  useEffect(() => {
    const interval = setInterval(() => fetchAll(true), 10000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[ACP] WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "pulse" || msg.type === "heartbeat") {
          // Update specific agent in state without full re-fetch
          setAgents((prev) =>
            prev.map((a) =>
              a.id === msg.agent_id
                ? {
                    ...a,
                    status: msg.status || a.status,
                    model: msg.model || a.model,
                    provider: msg.provider || a.provider,
                    current_task: msg.current_task !== undefined ? msg.current_task : a.current_task,
                    last_activity: msg.timestamp || a.last_activity,
                  }
                : a
            )
          );
        }
      } catch (e) {
        console.error("[ACP] WS parse error:", e);
      }
    };

    ws.onerror = (err) => {
      console.error("[ACP] WebSocket error:", err);
    };

    ws.onclose = () => {
      console.log("[ACP] WebSocket closed");
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
        <div className="text-xs md:text-sm text-text-muted">v0.1.0</div>
      </div>

      {/* Stats Bar */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={Bot} label="Agents" value={`${overview.active_agents}/${overview.total_agents}`} sub="active/total" />
          <StatCard icon={Activity} label="Tokens Today" value={formatNumber(overview.total_tokens_today)} sub="input + output" />
          <StatCard icon={DollarSign} label="Cost Today" value={`$${overview.total_cost_today.toFixed(2)}`} sub="estimated" />
          <StatCard icon={Clock} label="Requests" value={formatNumber(overview.total_requests_today)} sub="today" />
        </div>
      )}

      {/* Agent Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Agents</h2>
        {agents.length === 0 ? (
          <div className="glass p-8 text-center text-text-muted">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No agents connected yet</p>
            <p className="text-sm mt-1">Connect your first agent to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>

      {/* Active Projects */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Active Projects</h2>
        {projects.length === 0 ? (
          <div className="glass p-8 text-center text-text-muted">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No projects yet</p>
            <p className="text-sm mt-1">Projects are auto-created when agents report activity</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.filter(p => p.status === "active").map((project) => (
              <div key={project.id} className="glass p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FolderKanban className="w-4 h-4 text-accent-secondary" />
                  <h3 className="font-medium">{project.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-status-active/20 text-status-active">
                    {project.status}
                  </span>
                </div>
                {project.description && (
                  <p className="text-sm text-text-secondary">{project.description}</p>
                )}
                <div className="mt-2 text-xs text-text-muted">
                  {project.agents?.length || 0} agent{project.agents?.length !== 1 ? "s" : ""} working
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <div className="glass p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-accent-secondary" />
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-text-muted">{sub}</div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
