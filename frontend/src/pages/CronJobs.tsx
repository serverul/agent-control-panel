import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Clock, Plus, Play, Pause, RotateCw, Trash2, Bot, History } from "lucide-react";
import Modal from "../components/Modal";

export default function CronJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ agent_id: "", name: "", schedule: "", prompt: "" });
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyJobId, setHistoryJobId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchAll = () => {
    Promise.all([api.getCronJobs(), api.getAgents()])
      .then(([j, a]) => { setJobs(j); setAgents(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const create = async () => {
    try {
      await api.createCronJob(form);
      setModalOpen(false);
      setForm({ agent_id: "", name: "", schedule: "", prompt: "" });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const toggle = async (job: any) => {
    try {
      if (job.enabled) await api.pauseCronJob(job.id);
      else await api.resumeCronJob(job.id);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const run = async (jobId: string) => {
    try { await api.runCronJob(jobId); fetchAll(); } catch (e) { console.error(e); }
  };

  const openHistory = async (jobId: string) => {
    setHistoryJobId(jobId);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const data = await api.getCronJobHistory(jobId);
      setHistoryData(data);
    } catch (e) {
      console.error(e);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Cron Jobs</h1>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-accent-primary hover:bg-accent-secondary text-white transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Job
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="glass p-8 text-center text-text-muted">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No cron jobs yet</p>
          <p className="text-sm mt-1">Create one to schedule automated tasks</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const agent = agents.find(a => a.id === job.agent_id);
            return (
              <div key={job.id} className="glass glass-hover p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{job.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${job.enabled ? "bg-status-active/20 text-status-active" : "bg-status-offline/20 text-status-offline"}`}>
                        {job.enabled ? "Active" : "Paused"}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted font-mono mt-1">{job.schedule}</p>
                    {agent && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-text-muted">
                        <Bot className="w-3 h-3" /> {agent.name}
                      </div>
                    )}
                    {job.prompt && <p className="text-xs text-text-muted mt-1 truncate">{job.prompt}</p>}
                    {job.last_run && (
                      <p className="text-xs text-text-muted mt-1">
                        Last run: {new Date(job.last_run).toLocaleString()} — {job.last_status || "unknown"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openHistory(job.id)} title="History"
                      className="p-2 rounded-lg text-text-muted hover:text-accent-secondary hover:bg-bg-tertiary transition-colors">
                      <History className="w-4 h-4" />
                    </button>
                    <button onClick={() => run(job.id)} title="Run now"
                      className="p-2 rounded-lg text-text-muted hover:text-accent-secondary hover:bg-bg-tertiary transition-colors">
                      <Play className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggle(job)} title={job.enabled ? "Pause" : "Resume"}
                      className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                      {job.enabled ? <Pause className="w-4 h-4" /> : <RotateCw className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Cron Job">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Agent</label>
            <select value={form.agent_id} onChange={e => setForm({ ...form, agent_id: e.target.value })}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary">
              <option value="">Select agent...</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary"
              placeholder="Daily report" />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Schedule (cron)</label>
            <input value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary font-mono"
              placeholder="0 9 * * *" />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Prompt</label>
            <textarea value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary h-24 resize-none"
              placeholder="What should the agent do?" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">Cancel</button>
            <button onClick={create} disabled={!form.agent_id || !form.name || !form.schedule}
              className="px-4 py-2 rounded-lg text-sm bg-accent-primary hover:bg-accent-secondary text-white transition-colors disabled:opacity-50">Create</button>
          </div>
        </div>
      </Modal>

      <Modal open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} title={historyJobId ? `History — ${jobs.find(j => j.id === historyJobId)?.name || ""}` : "History"}>
        <div className="space-y-3">
          {historyLoading ? (
            <div className="text-center text-text-muted py-8">Loading...</div>
          ) : historyData.length === 0 ? (
            <div className="text-center text-text-muted py-8">No history yet</div>
          ) : (
            historyData.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary">
                <div>
                  <p className="text-sm font-medium">{h.status || "unknown"}</p>
                  <p className="text-xs text-text-muted">{h.output || "No output"}</p>
                </div>
                <span className="text-xs text-text-muted whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
