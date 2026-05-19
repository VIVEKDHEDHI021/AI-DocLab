import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, FileSearch, Sparkles, Shield, Upload, Lock, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: Landing,
  head: () => ({
    meta: [
      { title: "Vault — AI Document Wallet" },
      { name: "description", content: "Upload any document. Vault auto-summarizes, tags, and categorizes it so you can find anything instantly." },
    ],
  }),
});

const features = [
  {
    icon: Upload,
    title: "Upload Anything",
    body: "PDF, image, Word doc, plain text — drag and drop to get started in seconds.",
    color: "from-violet-500 to-purple-600",
    glow: "rgba(139,92,246,0.3)",
  },
  {
    icon: Sparkles,
    title: "AI Does the Work",
    body: "Every file gets an intelligent summary, category, and searchable tags automatically.",
    color: "from-indigo-500 to-blue-600",
    glow: "rgba(99,102,241,0.3)",
  },
  {
    icon: FileSearch,
    title: "Find it Instantly",
    body: "Search across your Aadhaar, PAN, documents, or any content with natural language.",
    color: "from-cyan-500 to-teal-600",
    glow: "rgba(20,184,166,0.3)",
  },
  {
    icon: Shield,
    title: "Stored on Your Drive",
    body: "Files live in your personal Google Drive — we never touch your data, you stay in control.",
    color: "from-emerald-500 to-green-600",
    glow: "rgba(16,185,129,0.3)",
  },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Background mesh */}
      <div className="pointer-events-none fixed inset-0 bg-mesh" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-hero-glow" aria-hidden />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 glass-strong">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-8">
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-sm">
              <Lock className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">Vault</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#privacy" className="hover:text-foreground transition-colors">Privacy</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-white/5">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-gradient-primary text-white shadow-glow-sm hover:opacity-90 transition-opacity font-medium">
                Get started <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 md:px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300 mb-8">
          <Star className="h-3 w-3 fill-violet-300" />
          AI-powered document management
        </div>

        <h1 className="font-display text-5xl font-extrabold tracking-tight text-white text-balance md:text-6xl lg:text-7xl">
          Your documents,{" "}
          <span className="gradient-text">made intelligent.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground text-balance leading-relaxed">
          Drop in any file — Aadhar, PAN card, contract, or receipt. Vault reads it with AI,
          extracts key info, and organizes everything automatically.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup">
            <Button
              size="lg"
              className="bg-gradient-primary text-white shadow-glow hover:opacity-90 transition-all h-12 px-8 text-base font-semibold"
            >
              Start for free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 hover:border-white/20"
            >
              Sign in
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { label: "Documents analyzed", value: "100%" },
            { label: "Storage cost", value: "Free" },
            { label: "Setup time", value: "< 1 min" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Everything you need</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              Vault handles the heavy lifting so you can focus on what matters.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-white/5 bg-card p-6 transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.04)` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 30px -5px ${f.glow}, 0 0 0 1px rgba(255,255,255,0.08)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.04)`;
                }}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-glow-sm`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-5 font-display text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy section */}
      <section id="privacy" className="py-20 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6 md:px-8">
          <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-10 md:p-16 text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h2 className="mt-6 font-display text-3xl font-bold text-white md:text-4xl">
              Your files, your Google Drive
            </h2>
            <p className="mt-4 max-w-lg mx-auto text-muted-foreground leading-relaxed">
              Every file you upload goes directly into your personal Google Drive in a private "Vault" folder.
              We only store metadata — your documents never touch our servers.
            </p>
            <Link to="/signup" className="mt-8 inline-block">
              <Button className="bg-gradient-primary text-white shadow-glow hover:opacity-90 h-11 px-7 font-semibold">
                Create your Vault <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>© {new Date().getFullYear()} Vault — Secure AI Document Wallet</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
