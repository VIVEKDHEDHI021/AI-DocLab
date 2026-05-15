
-- Documents table
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Uncategorized',
  tags text[] not null default '{}',
  summary text,
  file_path text not null,
  file_name text not null,
  file_type text,
  file_size bigint,
  status text not null default 'pending', -- pending | processing | ready | error
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_user_id_idx on public.documents(user_id);
create index documents_category_idx on public.documents(category);

alter table public.documents enable row level security;

create policy "users can view own documents" on public.documents
  for select using (auth.uid() = user_id);
create policy "users can insert own documents" on public.documents
  for insert with check (auth.uid() = user_id);
create policy "users can update own documents" on public.documents
  for update using (auth.uid() = user_id);
create policy "users can delete own documents" on public.documents
  for delete using (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Storage policies: files stored under <user_id>/<filename>
create policy "users can read own files" on storage.objects
  for select using (
    bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "users can upload own files" on storage.objects
  for insert with check (
    bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "users can update own files" on storage.objects
  for update using (
    bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "users can delete own files" on storage.objects
  for delete using (
    bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
  );
