import { useEffect, useState } from "react";

const API_BASE = "/api";

export default function Connect() {
  const [spec, setSpec] = useState<any>(null);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    const url = window.location.origin;
    setBaseUrl(url);
    fetch(`${API_BASE}/spec`)
      .then((r) => r.json())
      .then(setSpec)
      .catch(() => setSpec(null));
  }, []);

  const shellExample = `curl -X POST ${baseUrl}${API_BASE}/onboard \\
  -H "Content-Type: application/json" \\
  -d '{"name":"MyAgent","type":"custom","model":"claude","provider":"anthropic"}'`;

  const pythonExample = `import requests, time, json

# 1. ONBOARD — Register your agent
resp = requests.post("${baseUrl}${API_BASE}/onboard", json={
    "name": "MyAgent",
    "type": "custom",
    "model": "claude-sonnet-4",
    "provider": "anthropic"
})
data = resp.json()
AGENT_ID = data["agent_id"]
print(f"Connected! Agent ID: {AGENT_ID}")

# 2. HEARTBEAT LOOP — Keep agent alive
while True:
    requests.post(f"${baseUrl}${API_BASE}/agents/{AGENT_ID}/heartbeat")
    time.sleep(60)

# 3. PULSE — Send real-time updates
requests.post(f"${baseUrl}${API_BASE}/agents/{AGENT_ID}/pulse", json={
    "activity": "Working on feature X",
    "current_task": "Implement auth",
    "current_project": "my-project",
    "status": "active"
})`;

  const nodeExample = `const axios = require('axios');

async function connectAgent() {
  // 1. ONBOARD
  const resp = await axios.post('${baseUrl}${API_BASE}/onboard', {
    name: 'MyAgent',
    type: 'custom',
    model: 'gpt-4',
    provider: 'openai'
  });
  const agentId = resp.data.agent_id;
  console.log('Connected! ID:', agentId);

  // 2. HEARTBEAT
  setInterval(() => {
    axios.post(\`${baseUrl}${API_BASE}/agents/\${agentId}/heartbeat\`);
  }, 60000);

  // 3. PULSE
  await axios.post(\`${baseUrl}${API_BASE}/agents/\${agentId}/pulse\`, {
    activity: 'Working on feature X',
    current_task: 'Implement auth',
    status: 'active'
  });
}

connectAgent();`;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-emerald-400">🚀 Connect Your Agent</h1>
          <p className="text-gray-400 text-lg">
            Universal onboarding for <strong>any</strong> AI agent framework
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {["OpenCode", "Claude Code", "Codex", "Hermes", "Pterodactyl", "Custom"].map((f) => (
              <span key={f} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300 border border-gray-700">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Two-command pitch */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">⚡ Two commands to connect</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400 mb-1">1. Onboard (get your agent ID):</p>
              <pre className="bg-black rounded-lg p-4 text-sm text-emerald-300 overflow-x-auto font-mono">{shellExample}</pre>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">2. Start heartbeat (keep alive):</p>
              <pre className="bg-black rounded-lg p-4 text-sm text-emerald-300 overflow-x-auto font-mono">
{`while true; do
  curl -X POST ${baseUrl}${API_BASE}/agents/YOUR_AGENT_ID/heartbeat
  sleep 60
done`}
              </pre>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            That's it. Your agent appears on the dashboard. Send real-time updates via the <code className="text-emerald-400">/pulse</code> endpoint.
          </p>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-2xl mb-2">📡</div>
            <h3 className="font-semibold text-white mb-1">Onboard</h3>
            <p className="text-sm text-gray-400">
              Call <code>/api/onboard</code> once. No auth needed. You get an <code>agent_id</code> and URLs.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-2xl mb-2">💓</div>
            <h3 className="font-semibold text-white mb-1">Heartbeat</h3>
            <p className="text-sm text-gray-400">
              Ping <code>/heartbeat</code> every 30-60s. Dashboard shows "online" status and last seen time.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold text-white mb-1">Pulse</h3>
            <p className="text-sm text-gray-400">
              Send updates to <code>/pulse</code> anytime. Model, task, activity, project — all in real-time.
            </p>
          </div>
        </div>

        {/* Code examples */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">💻 Code Examples</h2>
          <div className="space-y-4">
            <details className="group">
              <summary className="cursor-pointer text-emerald-400 font-mono text-sm hover:text-emerald-300">
                Python (requests)
              </summary>
              <pre className="bg-black rounded-lg p-4 text-sm text-gray-300 overflow-x-auto font-mono mt-2">{pythonExample}</pre>
            </details>
            <details className="group">
              <summary className="cursor-pointer text-emerald-400 font-mono text-sm hover:text-emerald-300">
                Node.js (axios)
              </summary>
              <pre className="bg-black rounded-lg p-4 text-sm text-gray-300 overflow-x-auto font-mono mt-2">{nodeExample}</pre>
            </details>
          </div>
        </div>

        {/* WebSocket */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">🔗 WebSocket (Real-time)</h2>
          <p className="text-gray-400 text-sm">
            For true real-time updates, connect to the WebSocket. Dashboard viewers get instant updates when any agent sends a pulse.
          </p>
          <pre className="bg-black rounded-lg p-4 text-sm text-purple-300 overflow-x-auto font-mono">
{`# Global feed — all agents
wscat -c ${baseUrl.replace("http", "ws")}/ws

# Agent-specific room
wscat -c ${baseUrl.replace("http", "ws")}/ws/agents/YOUR_AGENT_ID`}
          </pre>
          <p className="text-sm text-gray-500">
            WebSocket broadcasts <code>pulse</code> and <code>heartbeat</code> events automatically when agents hit the REST endpoints.
          </p>
        </div>

        {/* API Spec */}
        {spec && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">📋 API Spec</h2>
            <p className="text-sm text-gray-400">
              Auto-discovered from <code>/api/spec</code>. Version: <span className="text-emerald-400">{spec.version}</span>
            </p>
            <div className="space-y-2">
              {spec.endpoints?.map((ep: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm border-b border-gray-800 pb-2 last:border-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${ep.method === "POST" ? "bg-emerald-900 text-emerald-300" : "bg-blue-900 text-blue-300"}`}>
                    {ep.method}
                  </span>
                  <div className="flex-1">
                    <code className="text-gray-300">{ep.path}</code>
                    <p className="text-gray-500 text-xs mt-0.5">{ep.description}</p>
                  </div>
                  <span className={`text-xs ${ep.auth_required ? "text-red-400" : "text-green-400"}`}>
                    {ep.auth_required ? "auth" : "open"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 pb-8">
          <p>
            Works with any agent framework. No SDK required. Just HTTP + JSON.
          </p>
          <p className="mt-1">
            Open source • Self-hostable • Framework-agnostic
          </p>
        </div>
      </div>
    </div>
  );
}
