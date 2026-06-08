-- Phase 1 seed: link two test login accounts to profiles (role + company).
--
-- auth.users rows must be created first via the Supabase Dashboard, NOT plain SQL:
--   Dashboard -> Authentication -> Users -> Add user
--     1) email: admin@imarabuilders.com   password: <choose one>   (check "Auto Confirm User")
--     2) email: admin@bkzrenos.com        password: <choose one>   (check "Auto Confirm User")
--   Then copy each user's UUID (shown in the Users table) and paste below.
--
-- Replace the two <PASTE-..-UUID-HERE> placeholders, then run this in the SQL Editor.

insert into profiles (id, full_name, email, role, company_id)
values
  (
    '<PASTE-IMARA-USER-UUID-HERE>',
    'Imara Admin',
    'admin@imarabuilders.com',
    'master_admin',
    (select id from companies where slug = 'imara')
  ),
  (
    '<PASTE-BKZ-USER-UUID-HERE>',
    'BKZ Admin',
    'admin@bkzrenos.com',
    'partner_admin',
    (select id from companies where slug = 'bkz')
  );
