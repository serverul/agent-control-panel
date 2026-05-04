import { useState } from "react";
import { api } from "../lib/api";
import { Zap, Eye, EyeOff } from "lucide-react";

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.login(username, password);
      onLogin(res.access_token);
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-accent-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Agent Control Panel</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
              placeholder="admin"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-primary transition-colors pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-status-error text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-primary hover:bg-accent-secondary text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
