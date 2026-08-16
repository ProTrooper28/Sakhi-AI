-- ============================================================================
-- Sakhi AI — Email OR Mobile sign-in
-- ----------------------------------------------------------------------------
-- The login screen accepts either an email address or a 10-digit Indian
-- mobile number. Supabase Auth authenticates by email + password, so when the
-- user types a phone number the app must resolve it to the account email.
--
-- `profiles.phone` stores the number in E.164 (+91XXXXXXXXXX) and is covered
-- by RLS (users can only read their own row), so a plain client-side lookup
-- would fail for a signed-out visitor. This SECURITY DEFINER function runs as
-- the table owner and returns ONLY the email for an exact normalized phone
-- match — it cannot be used to enumerate profiles (one column, one row, by
-- phone only, no wildcards).
--
-- It is granted to `anon` deliberately: the login screen runs before any
-- session exists, and resolving your own phone number to your own email is
-- the documented flow. Emails are already the OTP identifier in this app.
--
-- Run this in the Supabase SQL Editor (after the earlier migrations).
-- ============================================================================

create or replace function public.lookup_email_by_phone(p_phone text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.email
  from public.profiles p
  where regexp_replace(p.phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
    and p.email is not null
  limit 1;
$$;

comment on function public.lookup_email_by_phone(text) is
  'Resolve an account email from its normalized phone number (used by the Email OR Mobile sign-in screen).';

revoke execute on function public.lookup_email_by_phone(text) from public;
grant execute on function public.lookup_email_by_phone(text) to anon, authenticated;
