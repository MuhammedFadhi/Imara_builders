-- Phase 6.1: Lead visibility -- Imara-sourced leads are now hidden from BKZ by
-- default. Imara (master admin / lead's source company) can flip
-- `visible_to_partner` per-lead to share that specific lead with the partner
-- company. BKZ-sourced leads remain visible to Imara as before, since master
-- admin already sees everything regardless of this flag.
--
-- No change needed to the existing `leads_update_own_company` policy -- it
-- already restricts updates (including this new flag) to the lead's own
-- source company, so only Imara can toggle visibility on Imara's leads.
--
-- Run this in the Supabase SQL Editor after 0001-0007 are applied.

alter table leads add column visible_to_partner boolean not null default false;

drop policy if exists leads_select_all on leads;

create policy leads_select on leads
  for select
  to authenticated
  using (
    fn_is_master_admin()
    or lead_source_company_id = fn_my_company_id()
    or visible_to_partner = true
  );
