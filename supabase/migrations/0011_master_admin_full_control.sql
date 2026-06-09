-- Phase 7: Master Admin full control -- Imara (master_admin) can update/manage
-- any record regardless of which company originally created it. Previously the
-- four UPDATE policies below were scoped to "own company only", which blocked
-- Imara from editing BKZ leads, projects, job orders, and customers.
--
-- Payments, invoices, lead_activities, storage, and change_orders already had
-- fn_is_master_admin() in their policies -- no changes needed there.
--
-- Run this in the Supabase SQL Editor after 0001-0010 are applied.

-- Leads
drop policy if exists leads_update_own_company on leads;
create policy leads_update on leads
  for update
  to authenticated
  using (fn_is_master_admin() or lead_source_company_id = fn_my_company_id())
  with check (fn_is_master_admin() or lead_source_company_id = fn_my_company_id());

-- Projects
drop policy if exists projects_update_own_company on projects;
create policy projects_update on projects
  for update
  to authenticated
  using (fn_is_master_admin() or source_company_id = fn_my_company_id())
  with check (fn_is_master_admin() or source_company_id = fn_my_company_id());

-- Job Orders
drop policy if exists job_orders_update_own_company on job_orders;
create policy job_orders_update on job_orders
  for update
  to authenticated
  using (fn_is_master_admin() or source_company_id = fn_my_company_id())
  with check (fn_is_master_admin() or source_company_id = fn_my_company_id());

-- Customers
drop policy if exists customers_update_own_company on customers;
create policy customers_update on customers
  for update
  to authenticated
  using (fn_is_master_admin() or source_company_id = fn_my_company_id())
  with check (fn_is_master_admin() or source_company_id = fn_my_company_id());
