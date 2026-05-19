import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Search, Upload, Sparkles, AlertCircle, Loader2,
  Folder, Plus, CreditCard, HeartPulse, Briefcase, FileCheck,
  GraduationCap, Home, Car, ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Vault" }] }),
});

type Doc = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  summary: string | null;
  file_name: string;
  file_type: string | null;
  status: string;
  created_at: string;
};

const CATEGORY_META: Record<string, { icon: any; color: string; gradient: string; glow: string }> = {
  "Personal ID": { icon: CreditCard, color: "text-violet-400", gradient: "from-violet-500 to-purple-600", glow: "rgba(139,92,246,0.25)" },
  "Finance":     { icon: Briefcase, color: "text-emerald-400", gradient: "from-emerald-500 to-teal-600", glow: "rgba(16,185,129,0.25)" },
  "Medical":     { icon: HeartPulse, color: "text-rose-400",  gradient: "from-rose-500 to-pink-600",    glow: "rgba(244,63,94,0.25)" },
  "Education":   { icon: GraduationCap, color: "text-amber-400", gradient: "from-amber-500 to-orange-500", glow: "rgba(245,158,11,0.25)" },
  "Legal":       { icon: FileCheck, color: "text-blue-400",   gradient: "from-blue-500 to-indigo-600",  glow: "rgba(59,130,246,0.25)" },
  "Property":    { icon: Home, color: "text-orange-400",      gradient: "from-orange-500 to-amber-600", glow: "rgba(249,115,22,0.25)" },
  "Vehicle":     { icon: Car, color: "text-cyan-400",         gradient: "from-cyan-500 to-sky-600",     glow: "rgba(6,182,212,0.25)" },
  "Shopping":    { icon: ShoppingBag, color: "text-pink-400", gradient: "from-pink-500 to-fuchsia-600", glow: "rgba(236,72,153,0.25)" },
};

function getCatMeta(cat: string) {
  return CATEGORY_META[cat] ?? {
    icon: Folder,
    color: "text-muted-foreground",
    gradient: "from-slate-500 to-slate-600",
    glow: "rgba(100,116,139,0.2)",
  };
}

function Dashboard() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id,title,category,tags,summary,file_name,file_type,status,created_at")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) toast.error(error.message);
      setDocs((data as Doc[]) ?? []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("documents_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    docs.forEach((d) => map.set(d.category, (map.get(d.category) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [docs]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return docs.filter((d) => {
      if (activeCategory && d.category !== activeCategory) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.file_name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.summary?.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [docs, query, activeCategory]);

  const groupedFiltered = useMemo(() => {
    if (activeCategory) {
      const catDocs = filtered.filter((d) => d.category === activeCategory);
      return catDocs.length > 0 ? [[activeCategory, catDocs] as [string, Doc[]]] : [];
    }
    return categories
      .map(([cat]) => [cat, filtered.filter((d) => d.category === cat)] as [string, Doc[]])
      .filter(([, docs]) => docs.length > 0);
  }, [categories, filtered, activeCategory]);

  const readyCount = docs.filter((d) => d.status === "ready").length;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white md:text-4xl">Your Vault</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {docs.length} document{docs.length !== 1 ? "s" : ""} ·{" "}
            <span className="text-emerald-400">{readyCount} analyzed</span>
          </p>
        </div>
        <Link to="/upload">
          <Button className="bg-gradient-primary text-white shadow-glow-sm hover:opacity-90 transition-opacity h-10 gap-2 font-medium">
            <Plus className="h-4 w-4" /> Upload
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          id="vault-search"
          placeholder="Search documents, tags, content…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 pl-10 bg-surface border-white/8 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-violet-500/50 rounded-xl text-sm"
        />
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-medium transition-all ${
              activeCategory === null
                ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                : "border-white/8 bg-white/4 text-muted-foreground hover:border-white/15 hover:text-foreground"
            }`}
          >
            All <span className="opacity-60">({docs.length})</span>
          </button>
          {categories.map(([cat, count]) => {
            const meta = getCatMeta(cat);
            const CatIcon = meta.icon;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                    : "border-white/8 bg-white/4 text-muted-foreground hover:border-white/15 hover:text-foreground"
                }`}
              >
                <CatIcon className={`h-3 w-3 ${meta.color}`} />
                {cat} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          <p className="text-sm text-muted-foreground">Loading your vault…</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasDocs={docs.length > 0} />
      ) : (
        <div className="space-y-10">
          {groupedFiltered.map(([cat, catDocs]) => {
            const meta = getCatMeta(cat);
            const CatIcon = meta.icon;
            return (
              <section key={cat} className="space-y-4">
                {/* Category header */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${meta.gradient}`}
                    style={{ boxShadow: `0 0 12px -2px ${meta.glow}` }}
                  >
                    <CatIcon className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="font-display text-lg font-semibold text-white">{cat}</h2>
                  <span className="rounded-full bg-white/5 border border-white/8 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {catDocs.length}
                  </span>
                </div>

                {/* Doc cards grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {catDocs.map((d) => (
                    <DocCard key={d.id} doc={d} meta={meta} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocCard({ doc, meta }: { doc: Doc; meta: ReturnType<typeof getCatMeta> }) {
  return (
    <Link
      to="/documents/$id"
      params={{ id: doc.id }}
      className="group relative flex flex-col rounded-2xl border border-white/6 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
      style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px -4px ${meta.glow}, 0 0 0 1px rgba(255,255,255,0.08)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(255,255,255,0.04)";
      }}
    >
      {/* Subtle gradient background overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at top right, ${meta.glow}, transparent 70%)`,
        }}
      />

      <div className="relative flex items-center justify-between">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${meta.gradient} transition-transform group-hover:scale-105`}
        >
          <FileText className="h-3.5 w-3.5 text-white" />
        </div>
        <StatusPill status={doc.status} />
      </div>

      <div className="relative mt-3 min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold text-white leading-snug">
          {doc.title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground mt-0.5">{doc.file_name}</p>
      </div>

      {doc.summary && (
        <p className="relative mt-2.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
          {doc.summary}
        </p>
      )}

      {doc.tags.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-1">
          {doc.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-md border border-white/6 bg-white/4 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              #{t}
            </span>
          ))}
          {doc.tags.length > 3 && (
            <span className="rounded-md border border-white/6 bg-white/4 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{doc.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <p className="relative mt-3 text-[10px] text-muted-foreground/50">
        {new Date(doc.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "processing" || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Analyzing
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">
        <AlertCircle className="h-2.5 w-2.5" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
      <Sparkles className="h-2.5 w-2.5" /> Ready
    </span>
  );
}

function EmptyState({ hasDocs }: { hasDocs: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/8 bg-surface/50 py-24 text-center px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow mb-5">
        <FileText className="h-7 w-7 text-white" />
      </div>
      <h3 className="font-display text-xl font-semibold text-white">
        {hasDocs ? "No matching documents" : "Your vault is empty"}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {hasDocs
          ? "Try adjusting your search or category filter."
          : "Upload your first document to get started. AI will automatically organize and extract key information."}
      </p>
      {!hasDocs && (
        <Link to="/upload" className="mt-8">
          <Button className="bg-gradient-primary text-white shadow-glow hover:opacity-90 transition-opacity gap-2 font-semibold h-11 px-7">
            <Upload className="h-4 w-4" /> Upload your first document
          </Button>
        </Link>
      )}
    </div>
  );
}
