-- ---------------------------------------------------------------------------
-- project_financials: "profit split" data, Master-Admin-only (Decisions #3)
-- Partner Admin has zero access -- not even via a view -- so internal cost /
-- profit margin never reaches their client even with a buggy frontend.
-- ---------------------------------------------------------------------------
create table project_financials (
  project_id uuid primary key references projects(id) on delete cascade,
  internal_cost numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_project_financials_updated_at
  before update on project_financials
  for each row execute function set_updated_at();

alter table project_financials enable row level security;

create policy project_financials_master_admin_only on project_financials
  for all
  to authenticated
  using (fn_is_master_admin())
  with check (fn_is_master_admin());

-- ---------------------------------------------------------------------------
-- project_profit_view: contract value vs. internal cost -> profit margin.
-- MUST be security_invoker -- without it, the view runs with its owner's
-- privileges and bypasses RLS entirely, leaking profit data to every
-- authenticated user. With it, Postgres re-checks RLS as the calling user,
-- so the master-admin-only policy on project_financials naturally empties
-- this view for Partner Admins (the "zero access" guarantee from Decisions #3).
-- ---------------------------------------------------------------------------
create view project_profit_view
  with (security_invoker = true)
  as
select
  pf.project_id,
  p.contract_value,
  pf.internal_cost,
  p.contract_value - pf.internal_cost as profit_margin
from project_financials pf
join projects p on p.id = pf.project_id;
