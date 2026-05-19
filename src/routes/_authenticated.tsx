import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, LayoutDashboard, LogOut, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function AuthLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Lock className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Vault</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setAiOpen(true)} className="text-primary">
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-surface/50 p-4 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Lock className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Vault</span>
        </div>
        
        <nav className="mt-8 flex flex-1 flex-col gap-2">
          <Link to="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground" activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" }}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <Link to="/upload" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground" activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" }}>
            <Upload className="h-4 w-4" /> Upload
          </Link>
          <button onClick={() => setAiOpen(true)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground w-full text-left cursor-pointer">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" /> AI Assistant
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-4 border-t border-border/60 pt-4">
          <div className="px-3 text-xs text-muted-foreground truncate">{email}</div>
          <Button variant="ghost" className="justify-start gap-3" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border/60 bg-background/85 backdrop-blur-xl md:hidden">
        <Link to="/dashboard" className="flex flex-col items-center gap-1 text-muted-foreground" activeProps={{ className: "text-primary" }}>
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>
        <button onClick={() => setAiOpen(true)} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary cursor-pointer">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <span className="text-[10px] font-medium">AI Bot</span>
        </button>
        <Link to="/upload" className="flex flex-col items-center gap-1 text-muted-foreground" activeProps={{ className: "text-primary" }}>
          <Upload className="h-5 w-5" />
          <span className="text-[10px] font-medium">Upload</span>
        </Link>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:ml-64 md:pb-0">
        <div className="mx-auto max-w-5xl p-6 md:p-10">
          <Outlet />
        </div>
      </main>

      <VaultAIAssistant isOpen={aiOpen} setIsOpen={setAiOpen} />
    </div>
  );
}
