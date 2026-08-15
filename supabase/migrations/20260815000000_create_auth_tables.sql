-- ============================================================================
-- Sakhi AI — Authentication schema
-- ----------------------------------------------------------------------------
-- Tables:  profiles, guardian_links
-- Triggers: auto-create a profile when a new auth user signs up, keep
--           updated_at fresh.
-- Security: Row Level Security on both tables (Step 9).
--
--   * profiles.aadhaar_last4 stores ONLY the last four digits of the Aadhaar
--     number. The full number is never sent to the backend, stored, or
--     exposed by any policy.
--   * Role values: 'user' | 'parent'.
--   * guardian_links.status: 'pending' | 'accepted'.
-- ============================================================================

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null default '',
  aadhaar_last4  text, -- last 4 digits only — never the full Aadhaar number
  phone          text,
  email          text,
  role           text not null default 'user' check (role in ('user', 'parent')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on column public.profiles.aadhaar_last4 is
  'Last four digits of the Aadhaar number only. Full Aadhaar is never stored.';

-- ── guardian_links ──────────────────────────────────────────────────────────
create table if not exists public.guardian_links (
  id          uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  unique (guardian_id, user_id)
);

-- ── Auto-create a profile row when an auth user signs up ───────────────────
-- Supabase Auth's signInWithOtp stores full_name / phone / role in
-- auth.users.raw_user_meta_data (phone is collected during onboarding so it
-- can later back SMS OTP and SOS alerts); this trigger copies them into
-- profiles so the client only needs its own-row update privilege. Email is
-- always present because it's the OTP identifier. Aadhaar (last 4) is added
-- later by the user on the first-login Profile Completion screen.
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

-- ── Keep updated_at fresh ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── Row Level Security (Step 9) ─────────────────────────────────────────────
-- Users can access only their own records; parents can only access the
-- profiles of users who have accepted a guardian link.
alter table public.profiles enable row level security;
alter table public.guardian_links enable row level security;

-- profiles: read own row, or a linked user's row (as an accepted guardian)
drop policy if exists "profiles_select_own_or_linked" on public.profiles;
create policy "profiles_select_own_or_linked"
  on public.profiles
  for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.guardian_links gl
      where gl.user_id = public.profiles.id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

-- profiles: update only your own row
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- profiles: allow inserts for the auth user's own row (defense in depth;
-- the trigger normally handles creation)
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- guardian_links: guardians create link requests for themselves
drop policy if exists "guardian_links_insert_guardian" on public.guardian_links;
create policy "guardian_links_insert_guardian"
  on public.guardian_links
  for insert
  with check (guardian_id = auth.uid());

-- guardian_links: see links you created or that were created for you
drop policy if exists "guardian_links_select_own" on public.guardian_links;
create policy "guardian_links_select_own"
  on public.guardian_links
  for select
  using (guardian_id = auth.uid() or user_id = auth.uid());

-- guardian_links: the linked user (or guardian) can update the status
-- (e.g. user accepts the guardian request)
drop policy if exists "guardian_links_update_own" on public.guardian_links;
create policy "guardian_links_update_own"
  on public.guardian_links
  for update
  using (guardian_id = auth.uid() or user_id = auth.uid())
  with check (guardian_id = auth.uid() or user_id = auth.uid());
