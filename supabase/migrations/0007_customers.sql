-- Phase 6: Customers -- "Won" leads convert to a Customer (not directly to a
-- Project), and Projects link to a Customer record via dropdown.
-- Run this in the Supabase SQL Editor after 0001-0006 are applied.

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create sequence if not exists customer_number_seq start 1;

create or replace function set_customer_number()
returns trigger
language plpgsql
as $$
begin
  if new.customer_number is null then
    new.customer_number := 'CUS-' || lpad(nextval('customer_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create table customers (
  id uuid primary key default gen_random_uuid(),
  customer_number text unique,
  full_name text not null,
  phone text,
  email text,
  address text,
  source_company_id uuid not null references companies(id),
  lead_id uuid references leads(id),
  notes text,
  created_by uuid references profiles(id),
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_set_customer_number
  before insert on customers
  for each row execute function set_customer_number();

create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

create index idx_customers_source_company on customers(source_company_id);
create index idx_customers_lead on customers(lead_id);

alter table customers enable row level security;

create policy customers_select_all on customers
  for select
  to authenticated
  using (true);

create policy customers_insert on customers
  for insert
  to authenticated
  with check (
    fn_is_master_admin()
    or (fn_is_partner_admin() and source_company_id = fn_my_company_id())
  );

create policy customers_update_own_company on customers
  for update
  to authenticated
  using (source_company_id = fn_my_company_id())
  with check (source_company_id = fn_my_company_id());

-- No delete policy: soft-delete (is_archived) only, mirrors leads/projects.

-- ---------------------------------------------------------------------------
-- projects.customer_id -- replaces the free-text client_name/project_address
-- columns. Backfill one customer per existing project (1:1, via a loop so
-- each project lands on its own new customer row rather than fuzzy-matching
-- back afterwards), then make the FK required and drop the old text columns.
-- ---------------------------------------------------------------------------
alter table projects add column customer_id uuid references customers(id);

do $$
declare
  proj record;
  new_customer_id uuid;
begin
  for proj in
    select p.id, p.client_name, p.project_address, p.source_company_id, p.lead_id, p.created_by,
           l.client_phone, l.client_email
    from projects p
    left join leads l on l.id = p.lead_id
  loop
    insert into customers (full_name, phone, email, address, source_company_id, lead_id, created_by)
    values (proj.client_name, proj.client_phone, proj.client_email, proj.project_address,
            proj.source_company_id, proj.lead_id, proj.created_by)
    returning id into new_customer_id;

    update projects set customer_id = new_customer_id where id = proj.id;
  end loop;
end $$;

alter table projects alter column customer_id set not null;
alter table projects drop column client_name;
alter table projects drop column project_address;

create index idx_projects_customer on projects(customer_id);

-- job_orders keep their own denormalized client_name/project_address (a point-
-- in-time snapshot, same rationale as before) -- just source the defaults from
-- the linked customer instead of the now-removed project text columns.
create or replace function set_job_order_defaults()
returns trigger
language plpgsql
as $$
declare
  parent record;
begin
  select p.source_company_id, c.full_name, c.address
  into parent
  from projects p
  join customers c on c.id = p.customer_id
  where p.id = new.project_id;

  if new.client_name is null then
    new.client_name := parent.full_name;
  end if;
  if new.project_address is null then
    new.project_address := parent.address;
  end if;
  if new.source_company_id is null then
    new.source_company_id := parent.source_company_id;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lead "Won" -> auto-create Customer (replaces the old auto-create-Project
-- trigger from 0004; creating the Project is now a separate manual step where
-- the user picks the new customer from a dropdown).
-- ---------------------------------------------------------------------------
drop trigger if exists trg_lead_won_create_project on leads;
drop function if exists fn_convert_lead_to_project();

alter table leads add column converted_customer_id uuid references customers(id);

create or replace function fn_convert_lead_to_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_customer_id uuid;
begin
  if new.lead_status = 'Won'
     and old.lead_status is distinct from 'Won'
     and new.converted_customer_id is null then

    insert into customers (
      full_name, phone, email, address, source_company_id, lead_id, created_by
    ) values (
      new.client_name, new.client_phone, new.client_email, new.property_address,
      new.lead_source_company_id, new.id, new.created_by
    )
    returning id into new_customer_id;

    new.converted_customer_id := new_customer_id;
  end if;

  return new;
end;
$$;

create trigger trg_lead_won_create_customer
  before update on leads
  for each row execute function fn_convert_lead_to_customer();
