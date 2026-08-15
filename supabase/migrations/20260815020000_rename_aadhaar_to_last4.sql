-- ============================================================================
-- Sakhi AI — rename profiles.aadhaar → profiles.aadhaar_last4
-- ----------------------------------------------------------------------------
-- Run this ONLY if you already executed 20260815000000_create_auth_tables.sql
-- on your Supabase project (the `profiles` table already exists with an
-- `aadhaar` column). It renames the column to the clearer `aadhaar_last4`
-- name used by the app, and recreates the signup trigger so new signups keep
-- working (the old trigger body referenced the old column name).
--
-- Fresh setups can skip this file — the create migration already uses
-- `aadhaar_last4`.
-- ============================================================================

-- ── Rename the column ───────────────────────────────────────────────────────
alter table public.profiles rename column aadhaar to aadhaar_last4;

comment on column public.profiles.aadhaar_last4 is
  'Last four digits of the Aadhaar number only. Full Aadhaar is never stored.';

-- ── Recreate the signup trigger against the new column name ────────────────
-- Phone is read from the signup metadata (collected during onboarding) so it
-- survives the Email OTP flow, where auth.users.phone is always null.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'phone', new.phone), ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
