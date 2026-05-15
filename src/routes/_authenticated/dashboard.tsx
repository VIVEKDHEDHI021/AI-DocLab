import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Upload,
  Sparkles,
  AlertCircle,
  Loader2,
  Folder,
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        () => load(),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Your Vault</h1>
          <p className="text-sm text-muted-foreground">
            {docs.length} document{docs.length === 1 ? "" : "s"} · AI-organized
          </p>
        </div>
        <Link to="/upload">
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by content, tag, vendor, category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              activeCategory === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({docs.length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeCategory === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              <Folder className="mr-1 inline h-3 w-3" />
              {cat} ({count})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasDocs={docs.length > 0} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <DocCard key={d.id} doc={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DocCard({ doc }: { doc: Doc }) {
  return (
    <Link
      to="/documents/$id"
      params={{ id: doc.id }}
      className="group rounded-xl border border-border/60 bg-card p-5 shadow-soft transition hover:border-primary/40 hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {doc.category}
        </div>
        <StatusPill status={doc.status} />
      </div>
      <div className="mt-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary group-hover:bg-gradient-primary group-hover:text-primary-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display font-semibold leading-tight">{doc.title}</div>
          <div className="truncate text-xs text-muted-foreground">{doc.file_name}</div>
        </div>
      </div>
      {doc.summary && (
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{doc.summary}</p>
      )}
      {doc.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1">
          {doc.tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">
              #{t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "processing" || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Analyzing
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
        <AlertCircle className="h-3 w-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success">
      <Sparkles className="h-3 w-3" /> Ready
    </span>
  );
}

function EmptyState({ hasDocs }: { hasDocs: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-surface py-20 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
        <FileText className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        {hasDocs ? "No matching documents" : "Your vault is empty"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasDocs ? "Try a different search or category." : "Upload your first document to get started."}
      </p>
      {!hasDocs && (
        <Link to="/upload">
          <Button className="mt-6 bg-gradient-primary text-primary-foreground shadow-glow">
            <Upload className="mr-2 h-4 w-4" /> Upload a document
          </Button>
        </Link>
      )}
    </div>
  );
}
