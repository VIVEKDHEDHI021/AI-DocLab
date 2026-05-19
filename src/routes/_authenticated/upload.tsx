import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { processDocument } from "@/lib/documents.functions";
import { useGoogleLogin } from "@react-oauth/google";
import { 
  Upload as UploadIcon, 
  FileText, 
  Loader2, 
  Cloud, 
  FolderOpen, 
  ShieldCheck, 
  LogOut, 
  Check, 
  AlertTriangle 
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadPage,
  head: () => ({ meta: [{ title: "Upload — Vault" }] }),
});

const getOrCreateVaultFolder = async (token: string): Promise<string> => {
  const cachedFolderId = localStorage.getItem("gdrive_vault_folder_id");
  if (cachedFolderId) return cachedFolderId;

  const query = encodeURIComponent("name='Vault' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to search Google Drive folders");
  const searchResult = await res.json();
  
  if (searchResult.files && searchResult.files.length > 0) {
    const id = searchResult.files[0].id;
    localStorage.setItem("gdrive_vault_folder_id", id);
    return id;
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Vault",
      mimeType: "application/vnd.google-apps.folder"
    })
  });
  if (!createRes.ok) throw new Error("Failed to create 'Vault' folder in Google Drive");
  const newFolder = await createRes.json();
  localStorage.setItem("gdrive_vault_folder_id", newFolder.id);
  return newFolder.id;
};

const uploadToGoogleDrive = async (file: File, token: string, folderId: string) => {
  const boundary = "vault_upload_boundary_" + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    parents: [folderId]
  };

  const parts = [
    delimiter,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    JSON.stringify(metadata),
    delimiter,
    `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
    file,
    closeDelimiter
  ];

  const body = new Blob(parts, { type: `multipart/related; boundary=${boundary}` });

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive upload failed: ${res.statusText} (${errText})`);
  }

  const driveFile = await res.json();
  return {
    id: driveFile.id,
    webViewLink: `https://drive.google.com/file/d/${driveFile.id}/preview`
  };
};

function UploadPage() {
  const navigate = useNavigate();
  const processFn = useServerFn(processDocument);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [googleToken, setGoogleToken] = useState<string | null>(() => localStorage.getItem("gdrive_access_token"));

  const isClientConfigured =
    import.meta.env.VITE_GOOGLE_CLIENT_ID &&
    !import.meta.env.VITE_GOOGLE_CLIENT_ID.startsWith("your-client-id-here");

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      if (tokenResponse.access_token) {
        localStorage.setItem("gdrive_access_token", tokenResponse.access_token);
        const expiresAt = Date.now() + (tokenResponse.expires_in || 3600) * 1000;
        localStorage.setItem("gdrive_token_expires_at", expiresAt.toString());
        setGoogleToken(tokenResponse.access_token);
        toast.success("Google Drive connected successfully!");
      }
    },
    onError: (err) => {
      console.error(err);
      toast.error("Google authentication failed. Please try again.");
    },
    scope: "https://www.googleapis.com/auth/drive.file",
  });

  const isTokenExpired = () => {
    const expiresAt = localStorage.getItem("gdrive_token_expires_at");
    if (!expiresAt) return true;
    return Date.now() > parseInt(expiresAt, 10);
  };

  useEffect(() => {
    if (googleToken && isTokenExpired()) {
      localStorage.removeItem("gdrive_access_token");
      localStorage.removeItem("gdrive_token_expires_at");
      setGoogleToken(null);
      toast.info("Google Drive session expired. Please reconnect.");
    }
  }, [googleToken]);

  const handleDisconnect = () => {
    localStorage.removeItem("gdrive_access_token");
    localStorage.removeItem("gdrive_token_expires_at");
    localStorage.removeItem("gdrive_vault_folder_id");
    setGoogleToken(null);
    toast.success("Google Drive disconnected");
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return toast.error("Not signed in");

      if (!googleToken) {
        return toast.error("Please connect your Google Drive first");
      }

      setUploading(true);
      let lastDocId: string | null = null;
      try {
        setProgress("Accessing 'Vault' folder in Google Drive…");
        const folderId = await getOrCreateVaultFolder(googleToken);

        for (const file of fileArr) {
          if (file.size > 25 * 1024 * 1024) {
            toast.error(`${file.name} is over 25MB`);
            continue;
          }
          setProgress(`Uploading ${file.name} to Google Drive…`);
          
          const driveFile = await uploadToGoogleDrive(file, googleToken, folderId);

          const { data: inserted, error: insErr } = await supabase
            .from("documents")
            .insert({
              user_id: user.id,
              title: file.name,
              file_name: file.name,
              file_type: file.type || null,
              file_size: file.size,
              drive_file_id: driveFile.id,
              drive_webview_link: driveFile.webViewLink,
              status: "pending",
            })
            .select("id")
            .single();

          if (insErr) throw insErr;
          lastDocId = inserted.id;

          setProgress(`Analyzing ${file.name} with AI…`);
          processFn({
            data: {
              documentId: inserted.id,
              googleAccessToken: googleToken,
            },
          }).catch((e) => {
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
    [processFn, navigate, googleToken],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Upload documents</h1>
        <p className="text-sm text-muted-foreground">
          Vault will read, summarize, and categorize each one automatically using your Google Drive.
        </p>
      </div>

      {!googleToken ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-soft">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Cloud className="h-8 w-8" />
            </div>
            <h3 className="mt-5 font-display text-xl font-bold">Connect your Google Drive</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              To store your documents 100% free and securely in your own cloud account, connect your Google Drive. 
              Vault will only ever read or write the files it creates.
            </p>
            <Button
              onClick={() => {
                if (!isClientConfigured) {
                  toast.error("Google Client ID is not configured. Please follow the instructions below.");
                  return;
                }
                login();
              }}
              className="mt-6 gap-2 bg-gradient-primary px-6 shadow-glow hover:opacity-90"
            >
              Connect Google Drive
            </Button>
          </div>

          {!isClientConfigured && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-left shadow-soft">
              <div className="flex items-center gap-2 text-amber-600 font-semibold">
                <AlertTriangle className="h-5 w-5" />
                <span>Google Drive Setup Required (Developer Action)</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                It looks like your `VITE_GOOGLE_CLIENT_ID` in `.env` is still set to the default placeholder. To authorize your Google Drive locally or in production:
              </p>
              <ol className="mt-3 space-y-2 text-xs text-muted-foreground list-decimal pl-4">
                <li>Create a Web OAuth client ID in the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="underline text-primary">Google Cloud Console</a>.</li>
                <li>Add scope `https://www.googleapis.com/auth/drive.file`.</li>
                <li>Set **Authorized JavaScript origins** to `http://localhost:8080` and `https://vault-app.aidocument.workers.dev`.</li>
                <li>Copy the client ID and replace the placeholder value of `VITE_GOOGLE_CLIENT_ID` inside your `.env` file.</li>
              </ol>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <Check className="h-4 w-4 rounded-full bg-emerald-500/20 p-0.5" />
              <span>Google Drive Connected</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> Disconnect
            </Button>
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
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 text-primary" />
          <div className="text-sm">
            <div className="font-semibold">What Vault does on upload</div>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>• Automatically organizes files in a private "Vault" folder on your Google Drive</li>
              <li>• Generates a clear, personalized human title (e.g. `vivek-aadhar`)</li>
              <li>• Writes a 2–3 sentence summary & extracts key identity/account numbers</li>
              <li>• Categorizes documents and adds searchable tags</li>
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
