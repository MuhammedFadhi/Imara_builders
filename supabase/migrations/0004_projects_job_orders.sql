-- Phase 3: Projects + Job Orders + Lead-to-Project conversion trigger
-- Run this in the Supabase SQL Editor after 0001/0002/0003 are applied.

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create sequence if not exists project_number_seq start 1;

create or replace function set_project_number()
returns trigger
language plpgsql
as $$
begin
  if new.project_number is null then
    new.project_number := 'PRJ-' || lpad(nextval('project_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create table projects (
  id uuid primary key default gen_random_uuid(),
  project_number text unique,
  project_date date not null default current_date,
  client_name text not null,
  project_address text,
  source_company_id uuid not null references companies(id),
  scope_of_work text,
  project_manager text,
  contract_value numeric(12, 2) not null default 0,
  project_status text not null default 'pending' check (project_status in ('done', 'pending', 'under process')),
  lead_id uuid references leads(id),
  created_by uuid references profiles(id),
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_set_project_number
  before insert on projects
  for each row execute function set_project_number();

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create index idx_projects_source_company on projects(source_company_id);
create index idx_projects_status on projects(project_status);

-- Now that projects exists, link leads.converted_project_id with a real FK
alter table leads
  add constraint leads_converted_project_id_fkey
  foreign key (converted_project_id) references projects(id);

-- ---------------------------------------------------------------------------
-- job_orders (children of projects)
-- ---------------------------------------------------------------------------
create sequence if not exists job_number_seq start 1;

create or replace function set_job_number()
returns trigger
language plpgsql
as $$
begin
  if new.job_number is null then
    new.job_number := 'JO-' || lpad(nextval('job_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create table job_orders (
  id uuid primary key default gen_random_uuid(),
  job_number text unique,
  project_id uuid not null references projects(id) on delete cascade,
  job_date date not null default current_date,
  description text,
  client_name text,
  project_address text,
  source_company_id uuid not null references companies(id),
  scope_of_work text,
  project_manager text,
  start_date date,
  estimated_completion_date date,
  contract_value numeric(12, 2) not null default 0,
  job_status text not null default 'Active' check (job_status in ('Active', 'On Hold', 'Completed', 'Cancelled')),
  created_by uuid references profiles(id),
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_set_job_number
  before insert on job_orders
  for each row execute function set_job_number();

create trigger trg_job_orders_updated_at
  before update on job_orders
  for each row execute function set_updated_at();

create index idx_job_orders_project on job_orders(project_id);

-- Default client_name / project_address / source_company_id from the parent project
-- when not explicitly provided, so the spec's duplicated fields stay consistent.
create or replace function set_job_order_defaults()
returns trigger
language plpgsql
as $$
declare
  parent projects%rowtype;
begin
  select * into parent from projects where id = new.project_id;

  if new.client_name is null then
    new.client_name := parent.client_name;
  end if;
  if new.project_address is null then
    new.project_address := parent.project_address;
  end if;
  if new.source_company_id is null then
    new.source_company_id := parent.source_company_id;
  end if;

  return new;
end;
$$;

create trigger trg_set_job_order_defaults
  before insert on job_orders
  for each row execute function set_job_order_defaults();

-- ---------------------------------------------------------------------------
-- Lead "Won" -> auto-create Project
-- ---------------------------------------------------------------------------
create or replace function fn_convert_lead_to_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project_id uuid;
begin
  if new.lead_status = 'Won'
     and old.lead_status is distinct from 'Won'
     and new.converted_project_id is null then

    insert into projects (
      client_name, project_address, source_company_id, contract_value,
      project_status, lead_id, created_by
    ) values (
      new.client_name, new.property_address, new.lead_source_company_id,
      coalesce(new.estimated_value, 0), 'pending', new.id, new.created_by
    )
    returning id into new_project_id;

    new.converted_project_id := new_project_id;
  end if;

  return new;
end;
$$;

create trigger trg_lead_won_create_project
  before update on leads
  for each row execute function fn_convert_lead_to_project();

-- ---------------------------------------------------------------------------
-- RLS: projects
-- ---------------------------------------------------------------------------
alter table projects enable row level security;

create policy projects_select_all on projects
  for select
  to authenticated
  using (true);

create policy projects_insert on projects
  for insert
  to authenticated
  with check (
    fn_is_master_admin()
    or (fn_is_partner_admin() and source_company_id = fn_my_company_id())
  );

create policy projects_update_own_company on projects
  for update
  to authenticated
  using (source_company_id = fn_my_company_id())
  with check (source_company_id = fn_my_company_id());

-- No delete policy: soft-delete (is_archived) only.

-- ---------------------------------------------------------------------------
-- RLS: job_orders (mirrors projects, keyed off job_orders.source_company_id)
-- ---------------------------------------------------------------------------
alter table job_orders enable row level security;

create policy job_orders_select_all on job_orders
  for select
  to authenticated
  using (true);

create policy job_orders_insert on job_orders
  for insert
  to authenticated
  with check (
    fn_is_master_admin()
    or (fn_is_partner_admin() and source_company_id = fn_my_company_id())
  );

create policy job_orders_update_own_company on job_orders
  for update
  to authenticated
  using (source_company_id = fn_my_company_id())
  with check (source_company_id = fn_my_company_id());

-- No delete policy: soft-delete (is_archived) only.
