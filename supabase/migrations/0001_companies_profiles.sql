-- Phase 1: Foundation -- companies, profiles, shared helpers, RLS
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- companies (lookup table: Imara Builders / BKZ Reno's Inc.)
-- ---------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

insert into companies (name, slug) values
  ('Imara Builders', 'imara'),
  ('BKZ Reno''s Inc.', 'bkz');

-- ---------------------------------------------------------------------------
-- profiles (extends auth.users -- stores role + company)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null check (role in ('master_admin', 'partner_admin')),
  company_id uuid not null references companies(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helper functions (security definer -- avoid RLS recursion when reading
-- the caller's own profile from inside other tables' policies)
-- ---------------------------------------------------------------------------
create or replace function fn_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function fn_my_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function fn_is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fn_my_role() = 'master_admin'
$$;

create or replace function fn_is_partner_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select fn_my_role() = 'partner_admin'
$$;

-- ---------------------------------------------------------------------------
-- RLS: companies
-- ---------------------------------------------------------------------------
alter table companies enable row level security;

create policy companies_select_all on companies
  for select
  to authenticated
  using (true);

create policy companies_write_master_admin on companies
  for all
  to authenticated
  using (fn_is_master_admin())
  with check (fn_is_master_admin());

-- ---------------------------------------------------------------------------
-- RLS: profiles
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;

create policy profiles_select_self_or_master_admin on profiles
  for select
  to authenticated
  using (id = auth.uid() or fn_is_master_admin());

create policy profiles_write_master_admin on profiles
  for all
  to authenticated
  using (fn_is_master_admin())
  with check (fn_is_master_admin());
