-- ============================================================================
-- Sakhi AI — store the onboarding phone number in profiles
-- ----------------------------------------------------------------------------
-- The app switched to Email OTP sign-in, but still collects the user's mobile
-- number during onboarding (kept on the profile for future SMS OTP migration
-- and SOS alerts). With Email OTP, `auth.users.phone` is always null, so this
-- refresh makes the signup trigger read the phone from the signup metadata
-- (auth.users.raw_user_meta_data.phone) with a fallback to the old behavior.
--
-- Run this in the Supabase SQL Editor if you already applied the earlier
-- migrations (20260815000000_create_auth_tables.sql and/or
-- 20260815020000_rename_aadhaar_to_last4.sql).
-- ============================================================================

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
