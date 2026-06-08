    -- Phase 6.3: Project visibility -- mirrors the lead visibility model (0008).
    -- Imara-sourced projects are now hidden from BKZ by default. Imara (master
    -- admin / project's source company) can flip `visible_to_partner` per-project
    -- to share that specific project with the partner company. BKZ-sourced
    -- projects remain visible to Imara as before, since master admin already sees
    -- everything regardless of this flag.
    --
    -- No change needed to `projects_update_own_company` -- it already restricts
    -- updates (including this new flag) to the project's own source company, so
    -- only Imara can toggle visibility on Imara's projects.
    --
    -- Run this in the Supabase SQL Editor after 0001-0009 are applied.

    alter table projects add column visible_to_partner boolean not null default false;

    drop policy if exists projects_select_all on projects;

    create policy projects_select on projects
      for select
      to authenticated
      using (
        fn_is_master_admin()
        or source_company_id = fn_my_company_id()
        or visible_to_partner = true
      );
