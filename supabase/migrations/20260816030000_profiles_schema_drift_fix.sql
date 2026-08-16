-- ============================================================================
-- Sakhi AI — live schema alignment (idempotent drift fix)
-- ----------------------------------------------------------------------------
-- Older installs created `profiles` / `guardian_links` before later migrations
-- added columns, and `create table if not exists` is a no-op once a table
-- exists — so the live tables can be missing columns the app expects:
--
--   * profiles:          aadhaar (old name) → aadhaar_last4, + phone,
--                        updated_at, invite_code
--   * guardian_links:    + relationship, guardian_name, user_name
--   * find_user_by_invite_code() RPC + guardian_links delete policy
--
-- Every statement below is guarded, so running it on a fully-migrated
-- project is a no-op. Run this in the Supabase SQL Editor.
-- ============================================================================

-- ── profiles.aadhaar → aadhaar_last4 (old installs) ─────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'aadhaar'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'aadhaar_last4'
  ) then
    alter table public.profiles rename column aadhaar to aadhaar_last4;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'aadhaar_last4'
  ) then
    alter table public.profiles add column aadhaar_last4 text;
  end if;
end $$;

comment on column public.profiles.aadhaar_last4 is
  'Last four digits of the Aadhaar number only. Full Aadhaar is never stored.';

-- ── profiles.phone (onboarding mobile — future SMS OTP / SOS alerts) ───────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone'
  ) then
    alter table public.profiles add column phone text;
  end if;
end $$;

-- ── profiles.updated_at (kept fresh by the set_updated_at trigger) ─────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at'
  ) then
    alter table public.profiles add column updated_at timestamptz not null default now();
  end if;
end $$;

-- ── profiles.invite_code (Guardian Management share code) ──────────────────
alter table public.profiles add column if not exists invite_code text;

create unique index if not exists profiles_invite_code_key
  on public.profiles (invite_code)
  where invite_code is not null;

comment on column public.profiles.invite_code is
  'Public invite code a guardian enters to request a link. Random 8 chars.';

-- ── guardian_links: relationship + denormalized names ───────────────────────
alter table public.guardian_links
  add column if not exists relationship  text,
  add column if not exists guardian_name text,
  add column if not exists user_name     text;

comment on column public.guardian_links.relationship is
  'How the linked user relates to the guardian (Mother, Father, …).';

-- ── Look up a user by invite code (guardian side) ───────────────────────────
-- SECURITY DEFINER: runs as the table owner so the guardian can resolve a code
-- without a select policy on profiles — returns ONLY the user id + name for
-- an exact code match on a role='user' account, and never the caller themself.
create or replace function public.find_user_by_invite_code(code text)
returns table (user_id uuid, full_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select p.id, p.full_name
    from public.profiles p
    where p.invite_code = upper(btrim(code))
      and p.role = 'user'
      and p.id <> auth.uid()
    limit 1;
end;
$$;

revoke execute on function public.find_user_by_invite_code(text) from public, anon;
grant execute on function public.find_user_by_invite_code(text) to authenticated;

-- ── Either party can remove a link (user rejects / guardian unlinks) ───────
drop policy if exists "guardian_links_delete_own" on public.guardian_links;
create policy "guardian_links_delete_own"
  on public.guardian_links
  for delete
  using (guardian_id = auth.uid() or user_id = auth.uid());

-- ── Recreate the signup trigger against the current column set ─────────────
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
