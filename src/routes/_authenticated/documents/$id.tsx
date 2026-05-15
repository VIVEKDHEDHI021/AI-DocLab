import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { processDocument } from "@/lib/documents.functions";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Sparkles,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documents/$id")({
  component: DocumentPage,
  head: () => ({ meta: [{ title: "Document — Vault" }] }),
});

type Doc = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  summary: string | null;
  description: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

function DocumentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const processFn = useServerFn(processDocument);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();
      if (!active) return;
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      setDoc(data as Doc);
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(data.file_path, 3600);
      if (active) setSignedUrl(signed?.signedUrl ?? null);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`doc_${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "documents", filter: `id=eq.${id}` },
        (payload) => setDoc(payload.new as Doc),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  const onDelete = async () => {
    if (!doc) return;
    if (!confirm("Delete this document?")) return;
    await supabase.storage.from("documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/dashboard" });
  };

  const onReanalyze = async () => {
    if (!doc) return;
    setReanalyzing(true);
    try {
      await processFn({ data: { documentId: doc.id } });
      toast.success("Re-analyzed");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!doc) {
    return <div className="text-center text-muted-foreground">Document not found.</div>;
  }

  const isProcessing = doc.status === "processing" || doc.status === "pending";
  const isImage = doc.file_type?.startsWith("image/");
  const isPdf = doc.file_type === "application/pdf";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {doc.category}
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-balance">
              {doc.title}
            </h1>
            <div className="mt-2 text-sm text-muted-foreground">
              {doc.file_name} · {formatBytes(doc.file_size)} ·{" "}
              {new Date(doc.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onReanalyze} disabled={reanalyzing || isProcessing}>
              {reanalyzing || isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Re-analyze
            </Button>
            {signedUrl && (
              <a href={signedUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </a>
            )}
            <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {doc.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {doc.tags.map((t) => (
              <span key={t} className="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI summary */}
      <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-soft">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">AI Summary</h2>
        </div>
        {isProcessing ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your document…
          </div>
        ) : doc.status === "error" ? (
          <div className="mt-4 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <div className="font-medium">Analysis failed</div>
              <div className="text-destructive/80">{doc.error_message}</div>
            </div>
          </div>
        ) : (
          <p className="mt-3 leading-relaxed text-foreground/90">
            {doc.summary || "No summary available."}
          </p>
        )}
      </div>

      {/* Preview */}
      {signedUrl && (
        <div className="rounded-2xl border border-border/60 bg-card p-2 shadow-soft">
          {isImage ? (
            <img src={signedUrl} alt={doc.title} className="mx-auto max-h-[600px] rounded-lg" />
          ) : isPdf ? (
            <iframe src={signedUrl} className="h-[600px] w-full rounded-lg" title={doc.title} />
          ) : (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-surface p-12 text-sm text-muted-foreground hover:text-foreground"
            >
              Open file in new tab <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function formatBytes(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
