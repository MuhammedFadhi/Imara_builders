-- Phase 6.2: Lead source channel -- "Lead Source" should describe how the
-- lead came in (social media, referral, etc.), not which company owns it.
-- The existing `lead_source_company_id` stays as-is (it drives ownership/RLS
-- and is now surfaced in the UI as "Company"); this adds a separate field for
-- the actual origin channel.
-- Run this in the Supabase SQL Editor after 0001-0008 are applied.

alter table leads add column lead_source text check (lead_source in
  ('Social Media', 'Referral', 'Website', 'Walk-in', 'Phone Call', 'Advertisement', 'Other'));
