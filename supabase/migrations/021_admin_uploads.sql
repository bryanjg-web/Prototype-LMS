-- Hertz LMS — Admin upload infrastructure
-- Adds: uploads history, upload_conflicts, field provenance on leads
-- Run after 020_add_body_shop.sql

-- =============================================================================
-- UPLOADS: Track every HLES/TRANSLOG upload
-- =============================================================================
create table if not exists public.uploads (
  id bigint generated always as identity primary key,
  upload_type text not null check (upload_type in ('hles', 'translog')),
  file_name text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  summary jsonb default '{}'::jsonb,
  row_count int default 0,
  new_count int default 0,
  updated_count int default 0,
  unchanged_count int default 0,
  failed_count int default 0,
  conflict_count int default 0,
  orphan_count int default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_name text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_uploads_type on public.uploads(upload_type);
create index idx_uploads_created on public.uploads(created_at desc);

alter table public.uploads enable row level security;
create policy "Allow public read uploads" on public.uploads for select using (true);
create policy "Allow public write uploads" on public.uploads for all using (true);

-- =============================================================================
-- UPLOAD CONFLICTS: Enrichment conflicts requiring admin resolution
-- =============================================================================
create table if not exists public.upload_conflicts (
  id bigint generated always as identity primary key,
  upload_id bigint not null references public.uploads(id) on delete cascade,
  lead_id bigint references public.leads(id) on delete cascade,
  reservation_id text not null,
  customer_name text,
  branch text,
  field_name text not null,
  source_value text,
  enriched_value text,
  conflict_type text not null check (conflict_type in ('contact_info', 'status_change', 'orphaned_lead')),
  resolution text check (resolution in ('keep_enriched', 'use_source', 'skip')),
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz default now()
);

create index idx_upload_conflicts_upload on public.upload_conflicts(upload_id);
create index idx_upload_conflicts_unresolved on public.upload_conflicts(upload_id) where resolution is null;

alter table public.upload_conflicts enable row level security;
create policy "Allow public read upload_conflicts" on public.upload_conflicts for select using (true);
create policy "Allow public write upload_conflicts" on public.upload_conflicts for all using (true);

-- =============================================================================
-- LEADS: Add field provenance columns for reconciliation
-- =============================================================================
alter table public.leads
  add column if not exists confirm_num text,
  add column if not exists knum text,
  add column if not exists source_email text,
  add column if not exists source_phone text,
  add column if not exists source_status text,
  add column if not exists last_upload_id bigint references public.uploads(id) on delete set null,
  add column if not exists cdp_name text,
  add column if not exists htz_region text,
  add column if not exists set_state text,
  add column if not exists zone text,
  add column if not exists area_mgr text,
  add column if not exists general_mgr text,
  add column if not exists rent_loc text;

create index if not exists idx_leads_confirm_num on public.leads(confirm_num);
create index if not exists idx_leads_knum on public.leads(knum);

comment on column public.leads.confirm_num is 'HLES CONFIRM_NUM — stable PK for upsert matching';
comment on column public.leads.knum is 'HLES KNUM — changes on conversion, used for TRANSLOG join';
comment on column public.leads.source_email is 'Email from HLES/TRANSLOG (vs enriched email column)';
comment on column public.leads.source_phone is 'Phone from HLES/TRANSLOG (vs enriched phone column)';
comment on column public.leads.source_status is 'Status from latest HLES upload (for change detection)';
comment on column public.leads.last_upload_id is 'FK to uploads table — which upload last touched this lead';
comment on column public.leads.cdp_name is 'CDP NAME from HLES — insurance partner name';
comment on column public.leads.rent_loc is 'RENT_LOC from HLES — full branch location string';

-- =============================================================================
-- ORG MAPPING: Add source tracking
-- =============================================================================
alter table public.org_mapping
  add column if not exists auto_derived boolean default false,
  add column if not exists last_upload_id bigint references public.uploads(id) on delete set null;

comment on column public.org_mapping.auto_derived is 'true if row was auto-derived from HLES upload';
