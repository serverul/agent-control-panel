import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { FolderKanban, Plus, Pencil, Save, X } from "lucide-react";
import Modal from "../components/Modal";

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", notes: "" });
  const [editNotes, setEditNotes] = useState("");

  const fetchAll = () => {
    api.getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const create = async () => {
    try {
      await api.createProject(form);
      setModalOpen(false);
      setForm({ name: "", description: "", notes: "" });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const saveNotes = async (id: string) => {
    try {
      await api.updateProject(id, { notes: editNotes });
      setEditId(null);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.updateProject(id, { status });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-text-muted">Loading...</div>;

  const statusColors: Record<string, string> = {
    active: "bg-status-active/20 text-status-active",
    paused: "bg-status-idle/20 text-status-idle",
    completed: "bg-accent-glow text-accent-secondary",
    archived: "bg-status-offline/20 text-status-offline",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Projects</h1>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-accent-primary hover:bg-accent-secondary text-white transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="glass p-8 text-center text-text-muted">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No projects yet</p>
          <p className="text-sm mt-1">Create a project to organize work across agents</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="glass glass-hover p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{p.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[p.status] || "bg-gray-800 text-gray-400"}`}>
                      {p.status}
                    </span>
                  </div>
                  {p.description && <p className="text-sm text-text-secondary mt-1">{p.description}</p>}
                  
                  {/* Agents working on this project */}
                  {p.agents && p.agents.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-xs text-text-muted">Agents:</span>
                      <div className="flex gap-1">
                        {p.agents.map((agentId: string) => (
                          <span key={agentId} className="text-xs px-2 py-0.5 rounded bg-accent-glow/30 text-accent-secondary">
                            {agentId.slice(0, 12)}...
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-muted">Notes</span>
                      {editId === p.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveNotes(p.id)} className="p-1 text-accent-secondary hover:text-accent-primary"><Save className="w-3 h-3" /></button>
                          <button onClick={() => setEditId(null)} className="p-1 text-text-muted hover:text-text-primary"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditId(p.id); setEditNotes(p.notes || ""); }}
                          className="p-1 text-text-muted hover:text-text-primary"><Pencil className="w-3 h-3" /></button>
                      )}
                    </div>
                    {editId === p.id ? (
                      <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                        className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary h-20 resize-none" />
                    ) : (
                      <p className="text-sm text-text-muted whitespace-pre-wrap">{p.notes || "No notes"}</p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-text-muted shrink-0">
                  {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Project">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary"
              placeholder="Project name" />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary"
              placeholder="Brief description" />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary h-24 resize-none"
              placeholder="Initial notes..." />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">Cancel</button>
            <button onClick={create} disabled={!form.name}
              className="px-4 py-2 rounded-lg text-sm bg-accent-primary hover:bg-accent-secondary text-white transition-colors disabled:opacity-50">Create</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
