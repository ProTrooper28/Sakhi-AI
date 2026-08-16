-- ============================================================================
-- Sakhi AI — real-time SOS + live location (two-device Guardian ↔ User)
-- ----------------------------------------------------------------------------
-- What this adds:
--   * safety_events  — every SOS trigger and safe check-in. Users insert their
--                      own events; guardians can read AND resolve the events of
--                      users linked to them (accepted guardian_links only).
--   * live_locations — one row per user, upserted continuously by the app
--                      (latitude/longitude/label/battery/updated_at). Guardians
--                      read only the rows of their accepted linked users.
--   * Realtime       — both tables are added to the supabase_realtime
--                      publication so the guardian dashboard updates
--                      automatically (RLS still applies per subscriber).
--   * guardian_links — safety net: re-created if missing (create-if-not-exists
--                      is a no-op when the earlier migrations already ran).
--
-- Run this in the Supabase SQL Editor AFTER
-- 20260815000000_create_auth_tables.sql (and friends). No app restart needed.
-- ============================================================================

-- ── guardian_links (safety net — no-op if already created) ──────────────────
create table if not exists public.guardian_links (
  id          uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  relationship  text,
  guardian_name text,
  user_name     text,
  created_at  timestamptz not null default now(),
  unique (guardian_id, user_id)
);

alter table public.guardian_links enable row level security;

drop policy if exists "guardian_links_select_own" on public.guardian_links;
create policy "guardian_links_select_own"
  on public.guardian_links for select
  using (guardian_id = auth.uid() or user_id = auth.uid());

drop policy if exists "guardian_links_insert_guardian" on public.guardian_links;
create policy "guardian_links_insert_guardian"
  on public.guardian_links for insert
  with check (guardian_id = auth.uid());

drop policy if exists "guardian_links_update_own" on public.guardian_links;
create policy "guardian_links_update_own"
  on public.guardian_links for update
  using (guardian_id = auth.uid() or user_id = auth.uid())
  with check (guardian_id = auth.uid() or user_id = auth.uid());

-- ── safety_events ────────────────────────────────────────────────────────────
create table if not exists public.safety_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  type           text not null default 'sos' check (type in ('sos', 'checkin')),
  status         text not null default 'active' check (status in ('active', 'resolved', 'cancelled')),
  latitude       double precision,
  longitude      double precision,
  location_label text,
  triggered_at   timestamptz not null default now(),
  resolved_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists safety_events_user_idx on public.safety_events (user_id, created_at desc);
create index if not exists safety_events_status_idx on public.safety_events (status) where status = 'active';

alter table public.safety_events enable row level security;

-- select: your own events, or events of users linked to you (accepted only)
drop policy if exists "safety_events_select" on public.safety_events;
create policy "safety_events_select"
  on public.safety_events for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.guardian_links gl
      where gl.user_id = safety_events.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

-- insert: users create events only for themselves (guests never write)
drop policy if exists "safety_events_insert" on public.safety_events;
create policy "safety_events_insert"
  on public.safety_events for insert
  with check (user_id = auth.uid());

-- update: resolve/cancel your own event, or a linked user's event (guardian
-- presses "Mark Safe")
drop policy if exists "safety_events_update" on public.safety_events;
create policy "safety_events_update"
  on public.safety_events for update
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.guardian_links gl
      where gl.user_id = safety_events.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

-- ── live_locations ───────────────────────────────────────────────────────────
create table if not exists public.live_locations (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  latitude       double precision not null,
  longitude      double precision not null,
  location_label text,
  battery_level  real,
  updated_at     timestamptz not null default now()
);

alter table public.live_locations enable row level security;

drop policy if exists "live_locations_select" on public.live_locations;
create policy "live_locations_select"
  on public.live_locations for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.guardian_links gl
      where gl.user_id = live_locations.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

drop policy if exists "live_locations_insert" on public.live_locations;
create policy "live_locations_insert"
  on public.live_locations for insert
  with check (user_id = auth.uid());

drop policy if exists "live_locations_update" on public.live_locations;
create policy "live_locations_update"
  on public.live_locations for update
  using (user_id = auth.uid());

-- ── Realtime (guardian dashboard updates without refresh) ───────────────────
-- RLS still applies to each subscriber: a guardian only ever receives rows
-- they can select (their linked users), a user only their own.
alter publication supabase_realtime add table public.safety_events;
alter publication supabase_realtime add table public.live_locations;
