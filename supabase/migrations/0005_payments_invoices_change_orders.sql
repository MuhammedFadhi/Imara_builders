-- Phase 4: Payments + Invoices + Change Orders + derived progress views
-- Run this in the Supabase SQL Editor after 0001/0002/0003/0004 are applied.

-- ---------------------------------------------------------------------------
-- payments (single source of truth for job-order "% paid")
-- ---------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  job_order_id uuid not null references job_orders(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text,
  reference_note text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_payments_job_order on payments(job_order_id);

alter table payments enable row level security;

create policy payments_select_all on payments
  for select
  to authenticated
  using (true);

create policy payments_insert on payments
  for insert
  to authenticated
  with check (
    fn_is_master_admin()
    or exists (
      select 1 from job_orders jo
      where jo.id = job_order_id and jo.source_company_id = fn_my_company_id()
    )
  );

create policy payments_update_own on payments
  for update
  to authenticated
  using (recorded_by = auth.uid() or fn_is_master_admin())
  with check (recorded_by = auth.uid() or fn_is_master_admin());

create policy payments_delete_own on payments
  for delete
  to authenticated
  using (recorded_by = auth.uid() or fn_is_master_admin());

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text,
  job_order_id uuid references job_orders(id) on delete set null,
  project_id uuid references projects(id),
  amount numeric(12, 2) not null,
  issue_date date default current_date,
  due_date date,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid', 'void')),
  file_path text,
  file_name text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  constraint invoices_must_reference_something check (job_order_id is not null or project_id is not null)
);

create index idx_invoices_job_order on invoices(job_order_id);
create index idx_invoices_project on invoices(project_id);

alter table invoices enable row level security;

create policy invoices_select_all on invoices
  for select
  to authenticated
  using (true);

create policy invoices_insert on invoices
  for insert
  to authenticated
  with check (
    fn_is_master_admin()
    or exists (
      select 1 from job_orders jo
      where jo.id = job_order_id and jo.source_company_id = fn_my_company_id()
    )
  );

create policy invoices_update_own on invoices
  for update
  to authenticated
  using (uploaded_by = auth.uid() or fn_is_master_admin())
  with check (uploaded_by = auth.uid() or fn_is_master_admin());

create policy invoices_delete_own on invoices
  for delete
  to authenticated
  using (uploaded_by = auth.uid() or fn_is_master_admin());

-- Storage bucket for uploaded invoice files
-- Path convention: {job_order_id}/{timestamp}-{filename} -- policies key off the first folder segment
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

create policy invoices_storage_select on storage.objects
  for select
  to authenticated
  using (bucket_id = 'invoices');

create policy invoices_storage_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'invoices'
    and (
      fn_is_master_admin()
      or exists (
        select 1 from job_orders jo
        where jo.id::text = (storage.foldername(name))[1]
        and jo.source_company_id = fn_my_company_id()
      )
    )
  );

create policy invoices_storage_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'invoices'
    and (owner = auth.uid() or fn_is_master_admin())
  );

-- ---------------------------------------------------------------------------
-- change_orders (Master-Admin managed; visible to both roles)
-- ---------------------------------------------------------------------------
create table change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  job_order_id uuid references job_orders(id),
  description text not null,
  amount_delta numeric(12, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid references profiles(id),
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_change_orders_project on change_orders(project_id);

create trigger trg_change_orders_updated_at
  before update on change_orders
  for each row execute function set_updated_at();

alter table change_orders enable row level security;

create policy change_orders_select_all on change_orders
  for select
  to authenticated
  using (true);

create policy change_orders_master_admin_manage on change_orders
  for all
  to authenticated
  using (fn_is_master_admin())
  with check (fn_is_master_admin());

-- ---------------------------------------------------------------------------
-- Derived "% paid" per job order (sum of payments / contract value)
-- ---------------------------------------------------------------------------
create or replace function fn_job_order_percent_paid(p_job_order_id uuid)
returns numeric
language sql
stable
as $$
  select case
    when jo.contract_value > 0 then
      round(coalesce(sum(p.amount), 0) / jo.contract_value * 100, 2)
    else 0
  end
  from job_orders jo
  left join payments p on p.job_order_id = jo.id
  where jo.id = p_job_order_id
  group by jo.id, jo.contract_value;
$$;

create view job_order_progress_view
  with (security_invoker = true)
  as
select
  jo.id as job_order_id,
  coalesce(sum(p.amount), 0) as amount_paid,
  case
    when jo.contract_value > 0 then
      round(coalesce(sum(p.amount), 0) / jo.contract_value * 100, 2)
    else 0
  end as percent_paid
from job_orders jo
left join payments p on p.job_order_id = jo.id
group by jo.id, jo.contract_value;

-- ---------------------------------------------------------------------------
-- Derived "% complete" per project: weighted average of child job orders'
-- % paid, weighted by each job order's contract value (per Decisions #2)
-- ---------------------------------------------------------------------------
create or replace function fn_project_percent_complete(p_project_id uuid)
returns numeric
language sql
stable
as $$
  select case
    when sum(jo.contract_value) > 0 then
      round(sum(jo.contract_value * coalesce(jop.percent_paid, 0)) / sum(jo.contract_value), 2)
    else 0
  end
  from job_orders jo
  left join job_order_progress_view jop on jop.job_order_id = jo.id
  where jo.project_id = p_project_id and jo.is_archived = false;
$$;

create view project_progress_view
  with (security_invoker = true)
  as
select
  p.id as project_id,
  case
    when sum(jo.contract_value) > 0 then
      round(sum(jo.contract_value * coalesce(jop.percent_paid, 0)) / sum(jo.contract_value), 2)
    else 0
  end as percent_complete
from projects p
left join job_orders jo on jo.project_id = p.id and jo.is_archived = false
left join job_order_progress_view jop on jop.job_order_id = jo.id
group by p.id;
