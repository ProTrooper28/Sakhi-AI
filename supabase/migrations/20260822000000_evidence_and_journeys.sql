-- ============================================================================
-- Sakhi AI — shared evidence locker + safety journey for Guardian ↔ User
-- ----------------------------------------------------------------------------
-- What this adds:
--   * evidence_items  — rows of evidence created by the user (during SOS or
--                       manually). Guardians can read evidence of linked users.
--   * active_journeys — one row per user tracking an active Safety Journey.
--                       Guardians can read journeys of linked users.
--
-- Run this in Supabase SQL Editor AFTER all previous migrations.
-- ============================================================================

-- ── evidence_items ──────────────────────────────────────────────────────────
create table if not exists public.evidence_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  item_type      text not null default 'sos-recording' check (item_type in ('sos-recording', 'report-media', 'audio', 'video', 'document')),
  name           text not null,
  file_url       text,
  file_type      text,
  location_label text,
  report_id      text,
  created_at     timestamptz not null default now()
);

create index if not exists evidence_items_user_idx on public.evidence_items (user_id, created_at desc);

alter table public.evidence_items enable row level security;

-- select: your own evidence, or evidence of users linked to you (guardian)
drop policy if exists "evidence_items_select" on public.evidence_items;
create policy "evidence_items_select"
  on public.evidence_items for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.guardian_links gl
      where gl.user_id = evidence_items.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

-- insert: users create their own evidence
drop policy if exists "evidence_items_insert" on public.evidence_items;
create policy "evidence_items_insert"
  on public.evidence_items for insert
  with check (user_id = auth.uid());

-- delete: users can delete their own evidence
drop policy if exists "evidence_items_delete" on public.evidence_items;
create policy "evidence_items_delete"
  on public.evidence_items for delete
  using (user_id = auth.uid());

-- ── active_journeys ─────────────────────────────────────────────────────────
-- One row per user. Upserted when a journey starts/updates, deleted when it ends.
-- Guardians read the journey of their linked users so they can see the
-- journey status, destination, travel mode and ETA on their dashboard.
create table if not exists public.active_journeys (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  status         text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  travel_mode    text,
  destination    text,
  destination_lat double precision,
  destination_lng double precision,
  start_lat      double precision,
  start_lng      double precision,
  start_label    text,
  eta_minutes    integer,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  updated_at     timestamptz not null default now(),
  journey_data   jsonb
);

alter table public.active_journeys enable row level security;

-- select: your own journey, or journey of users linked to you (guardian)
drop policy if exists "active_journeys_select" on public.active_journeys;
create policy "active_journeys_select"
  on public.active_journeys for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.guardian_links gl
      where gl.user_id = active_journeys.user_id
        and gl.guardian_id = auth.uid()
        and gl.status = 'accepted'
    )
  );

-- insert/update: users manage their own journey
drop policy if exists "active_journeys_insert" on public.active_journeys;
create policy "active_journeys_insert"
  on public.active_journeys for insert
  with check (user_id = auth.uid());

drop policy if exists "active_journeys_update" on public.active_journeys;
create policy "active_journeys_update"
  on public.active_journeys for update
  using (user_id = auth.uid());

-- delete: users can delete their own journey
drop policy if exists "active_journeys_delete" on public.active_journeys;
create policy "active_journeys_delete"
  on public.active_journeys for delete
  using (user_id = auth.uid());

-- ── Enable Realtime ─────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.evidence_items;
alter publication supabase_realtime add table public.active_journeys;
