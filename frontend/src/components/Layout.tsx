import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Bot, Clock, FolderKanban, MessageSquare, BarChart3, LogOut, Zap } from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/cron-jobs", label: "Cron Jobs", icon: Clock },
  { path: "/projects", label: "Projects", icon: FolderKanban },
  { path: "/chat", label: "Chat", icon: MessageSquare },
  { path: "/stats", label: "Stats", icon: BarChart3 },
];

export default function Layout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col glass border-r border-border-default">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg">ACP</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-accent-glow text-accent-secondary border border-accent-primary/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-status-error hover:bg-bg-tertiary w-full transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
