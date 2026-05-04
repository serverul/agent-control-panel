import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowLeft, Bot, Cpu, Activity, Clock, Settings, MessageSquare, BarChart3 } from "lucide-react";

export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState<any>(null);
  const [cronJobs, setCronJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getAgent(id), api.getCronJobs(id)])
      .then(([a, j]) => { setAgent(a); setCronJobs(j); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>;
  if (!agent) return <div className="text-center text-text-muted py-20">Agent not found</div>;

  const tabs = [
    { id: "overview", label: "Overview", icon: Bot },
    { id: "cron-jobs", label: "Cron Jobs", icon: Clock },
    { id: "config", label: "Config", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-glow flex items-center justify-center">
            <Bot className="w-5 h-5 text-accent-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-sm text-text-muted">{agent.type} - {agent.model}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`status-dot ${agent.status}`} />
          <span className="text-sm text-text-secondary capitalize">{agent.status}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-default">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-accent-primary text-accent-secondary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-2 gap-4">
          <InfoCard label="Status" value={agent.status} />
          <InfoCard label="Model" value={agent.model || "Not set"} />
          <InfoCard label="Provider" value={agent.provider || "Not set"} />
          <InfoCard label="Current Task" value={agent.current_task || "None"} />
          <InfoCard label="Last Activity" value={new Date(agent.last_activity).toLocaleString()} />
          <InfoCard label="Last Heartbeat" value={new Date(agent.last_heartbeat).toLocaleString()} />
        </div>
      )}

      {activeTab === "cron-jobs" && (
        <div className="space-y-3">
          {cronJobs.length === 0 ? (
            <div className="glass p-6 text-center text-text-muted">No cron jobs for this agent</div>
          ) : (
            cronJobs.map((job) => (
              <div key={job.id} className="glass p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{job.name}</h3>
                    <p className="text-sm text-text-muted">{job.schedule}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${job.enabled ? "bg-status-active/20 text-status-active" : "bg-status-offline/20 text-status-offline"}`}>
                      {job.enabled ? "Active" : "Paused"}
                    </span>
                    {job.last_status && (
                      <span className={`text-xs px-2 py-1 rounded ${job.last_status === "ok" ? "bg-status-active/20 text-status-active" : "bg-status-error/20 text-status-error"}`}>
                        {job.last_status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "config" && (
        <div className="glass p-6">
          <pre className="text-sm text-text-secondary overflow-auto">
            {JSON.stringify(agent.config, null, 2) || "No config set"}
          </pre>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass p-4">
      <div className="text-sm text-text-muted mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
