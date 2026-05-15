import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { processDocument } from "@/lib/documents.functions";
import { Upload as UploadIcon, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadPage,
  head: () => ({ meta: [{ title: "Upload — Vault" }] }),
});

function UploadPage() {
  const navigate = useNavigate();
  const processFn = useServerFn(processDocument);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return toast.error("Not signed in");

      setUploading(true);
      let lastDocId: string | null = null;
      try {
        for (const file of fileArr) {
          if (file.size > 25 * 1024 * 1024) {
            toast.error(`${file.name} is over 25MB`);
            continue;
          }
          setProgress(`Uploading ${file.name}…`);
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${user.id}/${Date.now()}-${safeName}`;
          const { error: upErr } = await supabase.storage
            .from("documents")
            .upload(path, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });
          if (upErr) throw upErr;

          const { data: inserted, error: insErr } = await supabase
            .from("documents")
            .insert({
              user_id: user.id,
              title: file.name,
              file_path: path,
              file_name: file.name,
              file_type: file.type || null,
              file_size: file.size,
              status: "pending",
            })
            .select("id")
            .single();
          if (insErr) throw insErr;
          lastDocId = inserted.id;

          setProgress(`Analyzing ${file.name} with AI…`);
          processFn({ data: { documentId: inserted.id } }).catch((e) => {
            console.error(e);
            toast.error(`AI analysis failed: ${e.message ?? e}`);
          });
        }
        toast.success("Uploaded — AI is analyzing in the background");
        if (fileArr.length === 1 && lastDocId) {
          navigate({ to: "/documents/$id", params: { id: lastDocId } });
        } else {
          navigate({ to: "/dashboard" });
        }
      } catch (err: any) {
        toast.error(err.message ?? "Upload failed");
      } finally {
        setUploading(false);
        setProgress("");
      }
    },
    [processFn, navigate],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Upload documents</h1>
        <p className="text-sm text-muted-foreground">
          Vault will read, summarize, and categorize each one automatically.
        </p>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        className={`relative block cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
          dragOver ? "border-primary bg-accent/40" : "border-border bg-surface hover:border-primary/40"
        }`}
      >
        <input
          type="file"
          multiple
          className="absolute inset-0 cursor-pointer opacity-0"
          accept=".pdf,.txt,.md,.csv,.json,.docx,.doc,image/*"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={uploading}
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadIcon className="h-6 w-6" />}
        </div>
        <h3 className="mt-5 font-display text-lg font-semibold">
          {uploading ? "Working…" : "Drop files here or click to browse"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {progress || "PDF, images, text, markdown, CSV, JSON · up to 25MB each"}
        </p>
      </label>

      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-sm">
            <div className="font-semibold">What Vault does on upload</div>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>• Generates a clear human title</li>
              <li>• Writes a 2–3 sentence summary</li>
              <li>• Picks the best category</li>
              <li>• Assigns searchable tags</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
