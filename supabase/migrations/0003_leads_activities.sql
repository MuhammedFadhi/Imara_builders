-- Phase 2: Leads + Lead Activities + Storage bucket for documents/photos
-- Run this in the Supabase SQL Editor after 0001/0002 are applied.

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create sequence if not exists lead_number_seq start 1;

create or replace function set_lead_number()
returns trigger
language plpgsql
as $$
begin
  if new.lead_number is null then
    new.lead_number := 'LD-' || lpad(nextval('lead_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create table leads (
  id uuid primary key default gen_random_uuid(),
  lead_number text unique,
  lead_source_company_id uuid not null references companies(id),
  client_name text not null,
  client_phone text,
  client_email text,
  property_address text,
  project_type text check (project_type in ('Renovation', 'New Build', 'Addition', 'Other')),
  estimated_value numeric(12, 2),
  lead_notes text,
  assigned_company_id uuid references companies(id),
  lead_status text not null default 'New Lead' check (lead_status in
    ('New Lead', 'Contacted', 'Site Visit Completed', 'Estimate Sent', 'Follow Up', 'Won', 'Lost')),
  created_by uuid references profiles(id),
  converted_project_id uuid, -- FK to projects added in 0004 once that table exists
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_set_lead_number
  before insert on leads
  for each row execute function set_lead_number();

create trigger trg_leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

create index idx_leads_source_company on leads(lead_source_company_id);
create index idx_leads_status on leads(lead_status);
create index idx_leads_created_at on leads(created_at desc);

-- ---------------------------------------------------------------------------
-- lead_activities (polymorphic: note / site_visit / document / photo / comment / status_change)
-- ---------------------------------------------------------------------------
create table lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  activity_type text not null check (activity_type in
    ('note', 'site_visit', 'document', 'photo', 'comment', 'status_change')),
  author_id uuid references profiles(id),
  author_company_id uuid references companies(id),
  body text,
  file_path text,
  file_name text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_lead_activities_lead on lead_activities(lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: leads
-- ---------------------------------------------------------------------------
alter table leads enable row level security;

create policy leads_select_all on leads
  for select
  to authenticated
  using (true);

create policy leads_insert on leads
  for insert
  to authenticated
  with check (
    fn_is_master_admin()
    or (fn_is_partner_admin() and lead_source_company_id = fn_my_company_id())
  );

create policy leads_update_own_company on leads
  for update
  to authenticated
  using (lead_source_company_id = fn_my_company_id())
  with check (lead_source_company_id = fn_my_company_id());

-- No delete policy: "deleting" a lead means setting is_archived = true via the update policy.

-- ---------------------------------------------------------------------------
-- RLS: lead_activities
-- ---------------------------------------------------------------------------
alter table lead_activities enable row level security;

create policy lead_activities_select_all on lead_activities
  for select
  to authenticated
  using (true);

create policy lead_activities_insert on lead_activities
  for insert
  to authenticated
  with check (
    activity_type = 'comment'
    or exists (
      select 1 from leads l
      where l.id = lead_activities.lead_id
      and l.lead_source_company_id = fn_my_company_id()
    )
    or fn_is_master_admin()
  );

create policy lead_activities_update_own on lead_activities
  for update
  to authenticated
  using (author_id = auth.uid() or fn_is_master_admin())
  with check (author_id = auth.uid() or fn_is_master_admin());

create policy lead_activities_delete_own on lead_activities
  for delete
  to authenticated
  using (author_id = auth.uid() or fn_is_master_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket for lead documents/photos
-- Path convention: {lead_id}/{filename} -- policies key off the first folder segment
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('lead-documents', 'lead-documents', false)
on conflict (id) do nothing;

create policy lead_documents_select on storage.objects
  for select
  to authenticated
  using (bucket_id = 'lead-documents');

create policy lead_documents_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'lead-documents'
    and (
      fn_is_master_admin()
      or exists (
        select 1 from leads l
        where l.id::text = (storage.foldername(name))[1]
        and l.lead_source_company_id = fn_my_company_id()
      )
    )
  );

create policy lead_documents_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'lead-documents'
    and (
      fn_is_master_admin()
      or exists (
        select 1 from leads l
        where l.id::text = (storage.foldername(name))[1]
        and l.lead_source_company_id = fn_my_company_id()
      )
    )
  );
