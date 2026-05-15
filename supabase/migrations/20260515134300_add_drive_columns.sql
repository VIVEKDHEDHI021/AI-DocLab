-- Add Google Drive columns to the documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS drive_file_id TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS drive_webview_link TEXT;

-- Make file_path nullable since Google Drive docs won't have a Supabase storage path
ALTER TABLE documents ALTER COLUMN file_path DROP NOT NULL;
