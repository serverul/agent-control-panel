const API_BASE = "/api";

function getHeaders() {
  const token = localStorage.getItem("acp_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem("acp_token");
    window.location.reload();
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  // Agents
  getAgents: () => request("/agents/"),
  getAgent: (id: string) => request(`/agents/${id}`),
  createAgent: (data: any) => request("/agents/", { method: "POST", body: JSON.stringify(data) }),
  updateAgent: (id: string, data: any) => request(`/agents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAgent: (id: string) => request(`/agents/${id}`, { method: "DELETE" }),

  // Cron Jobs
  getCronJobs: (agentId?: string) => request(`/cron-jobs/${agentId ? `?agent_id=${agentId}` : ""}`),
  createCronJob: (data: any) => request("/cron-jobs/", { method: "POST", body: JSON.stringify(data) }),
  updateCronJob: (id: string, data: any) => request(`/cron-jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  runCronJob: (id: string) => request(`/cron-jobs/${id}/run`, { method: "POST" }),
  pauseCronJob: (id: string) => request(`/cron-jobs/${id}/pause`, { method: "POST" }),
  resumeCronJob: (id: string) => request(`/cron-jobs/${id}/resume`, { method: "POST" }),

  // Projects
  getProjects: () => request("/projects/"),
  createProject: (data: any) => request("/projects/", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id: string, data: any) => request(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Chat
  getChannels: () => request("/chat/channels"),
  getMessages: (channel: string) => request(`/chat/channels/${encodeURIComponent(channel)}/messages`),
  sendMessage: (channel: string, content: string) =>
    request(`/chat/channels/${encodeURIComponent(channel)}/messages`, {
      method: "POST",
      body: JSON.stringify({ channel, content }),
    }),

  // Stats
  getOverview: () => request("/stats/overview"),
};
