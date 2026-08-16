-- ============================================================================
-- Sakhi AI — allow the 'admin' role (development accounts)
-- ----------------------------------------------------------------------------
-- The app now supports three roles: 'user', 'parent' (shown as "Guardian" in
-- the UI) and 'admin' (uses the User app until an admin app is built).
--
-- The original create-tables migration constrained role to ('user','parent').
-- The auto-profile trigger reads role from auth.users.raw_user_meta_data, so
-- creating the Admin dev account (scripts/seed-dev-accounts.ts) fails with a
-- CHECK violation unless this constraint is relaxed FIRST.
--
-- Run this in the Supabase SQL Editor BEFORE running `bun run seed:dev`.
-- ============================================================================

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'parent', 'admin'));
