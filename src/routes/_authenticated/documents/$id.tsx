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
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
  drive_file_id: string | null;
  drive_webview_link: string | null;
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
      if (data.drive_webview_link) {
        setSignedUrl(data.drive_webview_link);
      } else if (data.file_path) {
        const { data: signed } = await supabase.storage
          .from("documents")
          .createSignedUrl(data.file_path, 3600);
        if (active) setSignedUrl(signed?.signedUrl ?? null);
      }
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
    
    const token = localStorage.getItem("gdrive_access_token");
    if (doc.drive_file_id && token) {
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${doc.drive_file_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error("Failed to delete file from Google Drive:", e);
      }
    } else if (doc.file_path) {
      await supabase.storage.from("documents").remove([doc.file_path]);
    }

    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/dashboard" });
  };

  const onReanalyze = async () => {
    if (!doc) return;
    setReanalyzing(true);
    try {
      const token = localStorage.getItem("gdrive_access_token") || undefined;
      await processFn({
        data: {
          documentId: doc.id,
          googleAccessToken: token,
        },
      });
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
    <div className="mx-auto max-w-4xl space-y-5 fade-in">
      {/* Back */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border border-white/6 bg-card p-6 md:p-8" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.3)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-violet-300">
              {doc.category}
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold text-white tracking-tight text-balance md:text-3xl">
              {doc.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{doc.file_name}</span>
              <span className="opacity-40">·</span>
              <span>{formatBytes(doc.file_size)}</span>
              <span className="opacity-40">·</span>
              <span>{new Date(doc.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onReanalyze}
              disabled={reanalyzing || isProcessing}
              className="h-9 border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 gap-1.5 text-xs"
            >
              {reanalyzing || isProcessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Re-analyze
            </Button>

            {signedUrl && (
              <a href={signedUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="h-9 border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" /> Open
                </Button>
              </a>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-9 border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {doc.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5 border-t border-white/5 pt-4">
            {doc.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-md border border-white/6 bg-white/4 px-2 py-0.5 text-xs text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI Summary */}
      <div className="rounded-2xl border border-white/6 bg-card p-6 md:p-8" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <h2 className="font-display text-base font-semibold text-white">AI Summary</h2>
        </div>

        {isProcessing ? (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
            <span>Analyzing your document with AI…</span>
          </div>
        ) : doc.status === "error" ? (
          <div className="flex items-start gap-2.5 text-sm text-red-400 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold mb-0.5">Analysis failed</div>
              <div className="text-red-400/70 text-xs leading-relaxed">{doc.error_message}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {doc.summary || "No summary available yet."}
          </p>
        )}
      </div>

      {/* Preview */}
      {signedUrl && (
        <div
          className="rounded-2xl border border-white/6 overflow-hidden"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }}
        >
          {doc.drive_file_id ? (
            <iframe
              src={`https://drive.google.com/file/d/${doc.drive_file_id}/preview`}
              className="h-[65vh] w-full border-0 bg-surface"
              title={doc.title}
              allow="autoplay"
            />
          ) : isImage ? (
            <img src={signedUrl} alt={doc.title} className="mx-auto max-h-[70vh] object-contain bg-surface" />
          ) : isPdf ? (
            <iframe src={signedUrl} className="h-[70vh] w-full border-0 bg-surface" title={doc.title} />
          ) : (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-surface p-16 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open file in new tab
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

