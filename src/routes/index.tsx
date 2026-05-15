import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileSearch, Sparkles, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")(({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Vault — AI Document Wallet" },
      { name: "description", content: "Upload any document. Vault auto-summarizes, tags, and categorizes it so you can find anything instantly." },
    ],
  }),
}));

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Lock className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">Vault</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 pt-28 pb-32 text-center">
          <h1 className="font-display text-5xl font-bold tracking-tight text-balance md:text-6xl">
            Your documents,{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">made intelligent.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-balance">
            Drop in any file — contract, receipt, or research paper. Vault reads it,
            summarizes it, and tags it automatically.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                Start for free <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">Sign in</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Upload,
                title: "Upload anything",
                body: "PDF, image, Word doc, plain text — drag and drop to get started.",
              },
              {
                icon: Sparkles,
                title: "AI does the work",
                body: "Every file gets a summary, category, and tags automatically.",
              },
              {
                icon: FileSearch,
                title: "Find it instantly",
                body: "Search by topic, vendor, date, or keyword — no filing needed.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border/60 bg-card p-6 shadow-soft transition hover:border-primary/40 hover:shadow-glow"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary group-hover:bg-gradient-primary group-hover:text-primary-foreground transition">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-surface py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Ready to get organised?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Free for personal use. No credit card required.
          </p>
          <div className="mt-6">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                Create your Vault <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} Vault</div>
          <div className="flex items-center gap-2">
            <Lock className="h-3 w-3" />
            Private &amp; secure storage
          </div>
        </div>
      </footer>

    </div>
  );
}
