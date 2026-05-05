import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import AgentDetail from "./pages/AgentDetail";
import CronJobs from "./pages/CronJobs";
import Projects from "./pages/Projects";
import Chat from "./pages/Chat";
import Stats from "./pages/Stats";
import Login from "./pages/Login";
import Connect from "./pages/Connect";

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("acp_token"));

  return (
    <Routes>
      {/* Public routes — no auth needed */}
      <Route path="/connect" element={<Connect />} />

      {/* Auth route */}
      <Route
        path="/login"
        element={
          token ? (
            <Navigate to="/" />
          ) : (
            <Login onLogin={(t) => { localStorage.setItem("acp_token", t); setToken(t); }} />
          )
        }
      />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          token ? (
            <Layout onLogout={() => { localStorage.removeItem("acp_token"); setToken(null); }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/agents/:id" element={<AgentDetail />} />
                <Route path="/cron-jobs" element={<CronJobs />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

export default App;
