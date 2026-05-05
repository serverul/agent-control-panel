import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { BarChart3, Bot, Activity, DollarSign, Clock, Cpu, Zap } from "lucide-react";

interface Overview {
  total_agents: number;
  active_agents: number;
  total_tokens_today: number;
  total_cost_today: number;
  total_requests_today: number;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  model: string;
  provider: string;
  last_heartbeat: string;
}

export default function Stats() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getOverview(), api.getAgents()])
      .then(([o, a]) => { setOverview(o); setAgents(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>;

  const statusCounts = agents.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const providerCounts = agents.reduce((acc, a) => {
    if (a.provider) acc[a.provider] = (acc[a.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">Stats</h1>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={Bot} label="Agents" value={`${overview.active_agents}/${overview.total_agents}`} sub="active / total" />
          <StatCard icon={Activity} label="Tokens" value={formatNumber(overview.total_tokens_today)} sub="today" />
          <StatCard icon={DollarSign} label="Cost" value={`$${overview.total_cost_today.toFixed(2)}`} sub="today" />
          <StatCard icon={Zap} label="Requests" value={formatNumber(overview.total_requests_today)} sub="today" />
        </div>
      )}

      {/* Agent Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-5">
          <h2 className="text-sm font-medium text-text-secondary mb-4">Agent Status</h2>
          <div className="space-y-3">
            {["active", "idle", "error", "offline"].map((status) => {
              const count = statusCounts[status] || 0;
              const total = agents.length || 1;
              const pct = Math.round((count / total) * 100);
              const colors: Record<string, string> = {
                active: "bg-status-active", idle: "bg-status-idle", error: "bg-status-error", offline: "bg-status-offline"
              };
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary capitalize">{status}</span>
                    <span className="text-text-muted">{count}</span>
                  </div>
                  <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[status]} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Provider Breakdown */}
        <div className="glass p-5">
          <h2 className="text-sm font-medium text-text-secondary mb-4">Providers</h2>
          {Object.keys(providerCounts).length === 0 ? (
            <p className="text-sm text-text-muted">No providers configured</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(providerCounts).sort(([, a], [, b]) => b - a).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-accent-secondary" />
                    <span className="text-sm text-text-primary">{provider}</span>
                  </div>
                  <span className="text-sm text-text-muted">{count} agent{count > 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agent List */}
      <div className="glass p-5">
        <h2 className="text-sm font-medium text-text-secondary mb-4">All Agents</h2>
        {agents.length === 0 ? (
          <p className="text-sm text-text-muted">No agents connected</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border-default">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Framework</th>
                  <th className="pb-2 pr-4">Model</th>
                  <th className="pb-2 pr-4">Provider</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-border-default/50">
                    <td className="py-2.5 pr-4 font-medium">{a.name}</td>
                    <td className="py-2.5 pr-4 text-text-secondary">{a.type}</td>
                    <td className="py-2.5 pr-4 text-text-secondary font-mono text-xs">{a.model || "—"}</td>
                    <td className="py-2.5 pr-4 text-text-secondary">{a.provider || "—"}</td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-1.5">
                        <span className={`status-dot ${a.status}`} />
                        <span className="capitalize">{a.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
