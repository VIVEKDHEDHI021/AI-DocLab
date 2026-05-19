import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, LayoutDashboard, LogOut, Upload, Sparkles, Menu, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { VaultAIAssistant } from "@/components/VaultAIAssistant";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthLayout,
});

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload",    icon: Upload,          label: "Upload" },
];

function AuthLayout() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState<string | null>(null);
  const [initials, setInitials] = useState<string>("?");
  const [aiOpen, setAiOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const e = data.user?.email ?? null;
      setEmail(e);
      if (e) setInitials(e[0].toUpperCase());
    });
  }, []);

  // Close sidebar when navigating (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [currentPath]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Mobile overlay ──────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-sidebar transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:flex ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
          <Link to="/dashboard" className="flex items-center gap-2.5 select-none">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-sm">
              <Lock className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-white tracking-tight">Vault</span>
          </Link>
          <button
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = currentPath === to || (to !== "/dashboard" && currentPath.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-violet-500/15 text-violet-300 shadow-glow-sm"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? "text-violet-400" : "group-hover:text-foreground"
                  }`}
                />
                <span>{label}</span>
                {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-violet-400/60" />}
              </Link>
            );
          })}

          <button
            onClick={() => setAiOpen(true)}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all w-full text-left mt-1"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-violet-400 glow-pulse" />
            <span>AI Assistant</span>
          </button>

          {/* Divider */}
          <div className="mt-4 border-t border-white/5 pt-4">
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
              <div className="flex items-center gap-2 text-xs text-violet-300 font-semibold mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                AI Assistant
              </div>
              <p className="text-xs text-muted-foreground">Ask questions about your documents in natural language.</p>
              <button
                onClick={() => setAiOpen(true)}
                className="mt-2.5 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium flex items-center gap-1"
              >
                Open chat <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-violet text-white text-sm font-bold select-none">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground leading-tight">{email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Content area ────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 bg-sidebar px-4 md:hidden">
          <button
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2 select-none">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary">
              <Lock className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-display text-base font-bold text-white">Vault</span>
          </Link>
          <button
            className="flex items-center justify-center text-violet-400"
            onClick={() => setAiOpen(true)}
          >
            <Sparkles className="h-5 w-5 glow-pulse" />
          </button>
        </header>

        {/* Main scroll area */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-screen-xl w-full px-4 py-6 md:px-8 md:py-10 fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <VaultAIAssistant isOpen={aiOpen} setIsOpen={setAiOpen} />
    </div>
  );
}
