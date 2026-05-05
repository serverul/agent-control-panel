import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowLeft, Bot, Cpu, Activity, Clock, Settings, Pencil, Save, X, Plus, Play, Pause, RotateCw, Send, MessageSquare, Folder, Database } from "lucide-react";
import Modal from "../components/Modal";

export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState<any>(null);
  const [cronJobs, setCronJobs] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [cronModal, setCronModal] = useState(false);
  const [cronForm, setCronForm] = useState({ name: "", schedule: "", prompt: "" });
  const [saving, setSaving] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [queryResponse, setQueryResponse] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryPending, setQueryPending] = useState(false);
  const queryPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [memory, setMemory] = useState<any>(null);
  const [agentConfig, setAgentConfig] = useState<any>(null);

  const fetchAll = (silent = false) => {
    if (!id) return;
    Promise.all([api.getAgent(id), api.getCronJobs(id), api.getActivity(id), api.getAgentProjects(id), api.getAgentMemory(id), api.getAgentConfig(id)])
      .then(([a, j, act, proj, mem, cfg]) => {
        setAgent(a);
        setCronJobs(j);
        setActivity(act);
        setProjects(proj);
        setMemory(mem);
        setAgentConfig(cfg);
        setEditForm({ name: a.name, type: a.type, model: a.model, provider: a.provider });
      })
      .catch(console.error)
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => { fetchAll(); }, [id]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => fetchAll(true), 30000);
    return () => clearInterval(interval);
  }, [id]);

  // Clean up query polling on unmount
  useEffect(() => {
    return () => {
      if (queryPollRef.current) clearInterval(queryPollRef.current);
    };
  }, []);

  const saveAgent = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await api.updateAgent(id, editForm);
      setAgent(updated);
      setEditing(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const createCronJob = async () => {
    if (!id) return;
    try {
      await api.createCronJob({ agent_id: id, ...cronForm });
      setCronModal(false);
      setCronForm({ name: "", schedule: "", prompt: "" });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const toggleCronJob = async (job: any) => {
    try {
      if (job.enabled) await api.pauseCronJob(job.id);
      else await api.resumeCronJob(job.id);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const runCronJob = async (jobId: string) => {
    try {
      await api.runCronJob(jobId);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const queryAgent = async () => {
    if (!id || !queryText.trim()) return;
    setQueryLoading(true);
    setQueryResponse(null);
    setQueryPending(true);
    try {
      await api.queryAgent(id, queryText);
      setQueryText("");
      // Poll for result every 3 seconds
      if (queryPollRef.current) clearInterval(queryPollRef.current);
      queryPollRef.current = setInterval(async () => {
        try {
          const result = await api.getQueryResult(id);
          if (result && result.response) {
            setQueryResponse(result.response);
            setQueryPending(false);
            setQueryLoading(false);
            if (queryPollRef.current) clearInterval(queryPollRef.current);
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000);
    } catch (e) {
      setQueryResponse("Error: " + e);
      setQueryPending(false);
      setQueryLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>;
  if (!agent) return <div className="text-center text-text-muted py-20">Agent not found</div>;

  const tabs = [
    { id: "overview", label: "Overview", icon: Bot },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "projects", label: `Projects (${projects.length})`, icon: Folder },
    { id: "cron-jobs", label: `Cron Jobs (${cronJobs.length})`, icon: Clock },
    { id: "query", label: "Query Agent", icon: MessageSquare },
    { id: "memory", label: "Memory", icon: Database },
    { id: "config", label: "Config", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <Link to="/" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-accent-glow flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-accent-secondary" />
          </div>
          <div className="min-w-0">
            {editing ? (
              <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-bg-tertiary border border-border-default rounded px-2 py-1 text-lg font-bold w-full" />
            ) : (
              <h1 className="text-xl md:text-2xl font-bold truncate">{agent.name}</h1>
            )}
            <p className="text-xs md:text-sm text-text-muted">
              {editing ? (
                <span className="flex gap-2">
                  <input value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                    className="bg-bg-tertiary border border-border-default rounded px-2 py-0.5 text-xs w-24" placeholder="Framework" />
                  <input value={editForm.model} onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                    className="bg-bg-tertiary border border-border-default rounded px-2 py-0.5 text-xs flex-1" placeholder="Model" />
                </span>
              ) : (
                <>{agent.type} — {agent.model || "No model"}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-dot ${agent.status}`} />
          <span className="text-sm text-text-secondary capitalize">{agent.status}</span>
          {editing ? (
            <div className="flex gap-2 ml-2">
              <button onClick={saveAgent} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-accent-primary hover:bg-accent-secondary text-white transition-colors disabled:opacity-50">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => { setEditing(false); setEditForm({ name: agent.name, type: agent.type, model: agent.model, provider: agent.provider }); }}
                className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)}
              className="ml-2 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-default overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id ? "border-accent-primary text-accent-secondary" : "border-transparent text-text-muted hover:text-text-secondary"
              }`}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <InfoCard label="Status" value={agent.status} />
          <InfoCard label="Framework" value={agent.type} />
          <InfoCard label="Model" value={agent.model || "Not set"} />
          <InfoCard label="Provider" value={agent.provider || "Not set"} />
          <InfoCard label="Current Task" value={agent.current_task || "None"} />
          <InfoCard label="Current Project" value={agent.current_project || "None"} />
          <InfoCard label="Last Activity" value={formatDate(agent.last_activity)} />
          <InfoCard label="Last Heartbeat" value={formatDate(agent.last_heartbeat)} />
          <InfoCard label="Created" value={formatDate(agent.created_at)} />
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === "activity" && (
        <div className="space-y-3">
          {activity.length === 0 ? (
            <div className="glass p-8 text-center text-text-muted">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((item, index) => (
                <div key={index} className="glass p-4 flex items-start gap-4">
                  <div className="mt-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{item.action}</span>
                      {item.project && (
                        <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-muted">
                          {item.project}
                        </span>
                      )}
                    </div>
                    {item.details && (
                      <p className="text-sm text-text-secondary break-words">{item.details}</p>
                    )}
                    <p className="text-xs text-text-muted mt-1">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === "projects" && (
        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="glass p-8 text-center text-text-muted">
              <Folder className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No projects</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {projects.map((project) => (
                <div key={project.id || project.name} className="glass p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium truncate">{project.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      project.status === "active" ? "bg-status-active/20 text-status-active" :
                      project.status === "completed" ? "bg-status-idle/20 text-status-idle" :
                      "bg-status-offline/20 text-status-offline"
                    }`}>
                      {project.status || "Unknown"}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">
                    Role: {project.role || "Member"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cron Jobs Tab */}
      {activeTab === "cron-jobs" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-muted">{cronJobs.length} jobs</span>
            <button onClick={() => setCronModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-accent-primary hover:bg-accent-secondary text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Job
            </button>
          </div>
          {cronJobs.length === 0 ? (
            <div className="glass p-8 text-center text-text-muted">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No cron jobs yet</p>
              <p className="text-sm mt-1">Create one to schedule tasks for this agent</p>
            </div>
          ) : (
            cronJobs.map((job) => (
              <div key={job.id} className="glass p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{job.name}</h3>
                    <p className="text-sm text-text-muted font-mono">{job.schedule}</p>
                    {job.prompt && <p className="text-xs text-text-muted mt-1 truncate">{job.prompt}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.last_status && (
                      <span className={`text-xs px-2 py-1 rounded ${job.last_status === "ok" ? "bg-status-active/20 text-status-active" : job.last_status === "running" ? "bg-status-idle/20 text-status-idle" : "bg-status-error/20 text-status-error"}`}>
                        {job.last_status}
                      </span>
                    )}
                    <button onClick={() => runCronJob(job.id)} title="Run now"
                      className="p-1.5 rounded-lg text-text-muted hover:text-accent-secondary hover:bg-bg-tertiary transition-colors">
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleCronJob(job)} title={job.enabled ? "Pause" : "Resume"}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                      {job.enabled ? <Pause className="w-3.5 h-3.5" /> : <RotateCw className="w-3.5 h-3.5" />}
                    </button>
                    <span className={`text-xs px-2 py-1 rounded ${job.enabled ? "bg-status-active/20 text-status-active" : "bg-status-offline/20 text-status-offline"}`}>
                      {job.enabled ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Query Agent Tab */}
      {activeTab === "query" && (
        <div className="space-y-4">
          <div className="glass p-5">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Query Agent</h3>
            <p className="text-xs text-text-muted mb-4">
              Send a question to the agent. The agent will respond if it has a query endpoint.
            </p>
            <div className="space-y-3">
              <textarea
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                placeholder="What projects are you working on? What are you doing?"
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary h-24 resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={queryAgent}
                  disabled={!queryText.trim() || queryLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-accent-primary hover:bg-accent-secondary text-white transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {queryLoading ? "Sending..." : "Send Query"}
                </button>
              </div>
            </div>
          </div>

          {queryPending && !queryResponse && (
            <div className="glass p-5">
              <div className="flex items-center gap-3 text-text-secondary">
                <RotateCw className="w-4 h-4 animate-spin" />
                <p className="text-sm">Waiting for agent...</p>
              </div>
            </div>
          )}

          {queryResponse && (
            <div className="glass p-5">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Response</h3>
              <div className="p-4 bg-bg-tertiary rounded-lg">
                <p className="text-sm text-text-primary whitespace-pre-wrap">{queryResponse}</p>
              </div>
            </div>
          )}

          <div className="glass p-5">
            <h3 className="text-sm font-medium text-text-secondary mb-3">How It Works</h3>
            <ol className="text-xs text-text-muted space-y-2 list-decimal list-inside">
              <li>Type your query above and click "Send Query"</li>
              <li>ACP sends the query to the agent via heartbeat or API</li>
              <li>The agent processes the query and responds</li>
              <li>The response appears above</li>
            </ol>
            <div className="mt-4 p-3 bg-accent-glow/20 rounded-lg border border-accent-primary/20">
              <p className="text-xs text-accent-secondary">
                <strong>Note:</strong> For this to work, the agent needs to support query handling.
                Currently, Hermes can be extended to respond to queries via the heartbeat mechanism.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "memory" && (
        <div className="space-y-3">
          {(!memory || !memory.entries || memory.entries.length === 0) ? (
            <div className="glass p-8 text-center text-text-muted">
              <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No memory entries</p>
            </div>
          ) : (
            <div className="space-y-3">
              {memory.entries.map((entry: any, index: number) => (
                <div key={index} className="glass p-4">
                  <pre className="text-sm text-text-secondary overflow-auto whitespace-pre-wrap break-words">
                    {JSON.stringify(entry, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "config" && (
        <div className="glass p-6">
          <pre className="text-sm text-text-secondary overflow-auto whitespace-pre-wrap break-words">
            {agentConfig ? JSON.stringify(agentConfig, null, 2) : "No config set"}
          </pre>
        </div>
      )}

      {/* Cron Job Modal */}
      <Modal open={cronModal} onClose={() => setCronModal(false)} title="New Cron Job">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Name</label>
            <input value={cronForm.name} onChange={e => setCronForm({ ...cronForm, name: e.target.value })}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary"
              placeholder="Daily report" />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Schedule (cron)</label>
            <input value={cronForm.schedule} onChange={e => setCronForm({ ...cronForm, schedule: e.target.value })}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary font-mono"
              placeholder="0 9 * * *" />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Prompt</label>
            <textarea value={cronForm.prompt} onChange={e => setCronForm({ ...cronForm, prompt: e.target.value })}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary h-24 resize-none"
              placeholder="What should the agent do?" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCronModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">Cancel</button>
            <button onClick={createCronJob} className="px-4 py-2 rounded-lg text-sm bg-accent-primary hover:bg-accent-secondary text-white transition-colors">Create</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass p-4">
      <div className="text-sm text-text-muted mb-1">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}

function formatDate(d: string): string {
  if (!d) return "Never";
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}
