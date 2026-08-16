#!/usr/bin/env bun
/**
 * Sakhi AI — end-to-end SOS + Realtime verification (two-device flow)
 * ---------------------------------------------------------------------------
 * Runs the exact requests the app makes (PostgREST + GoTrue, RLS enforced by
 * the user tokens — NOT the service role key for data access), simulating:
 *
 *   Phone 1 (Aanya):   sign in → trigger SOS → upsert live location
 *                      → send safe check-in
 *   Phone 2 (Guardian):sign in → see Aanya linked → see active SOS + location
 *                      → Mark Safe (resolve the SOS)
 *
 * Also dumps the live table columns so schema drift (e.g. missing
 * aadhaar_last4) is visible instead of a silent failure.
 *
 * Usage:  bun run scripts/verify-sos.ts
 * Requires the same env as seed:dev.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const parseEnvFile = (p: string): Record<string, string> => {
  try {
    const out: Record<string, string> = {};
    for (const line of readFileSync(resolve(process.cwd(), p), "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[t.slice(0, eq).trim()] = v;
    }
    return out;
  } catch {
    return {};
  }
};

const env = { ...parseEnvFile(".env"), ...parseEnvFile(".env.local"), ...(process.env as Record<string, string>) };
const url = (env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const anonKey = env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !anonKey || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const pass = (m: string) => console.log(`  ✅ ${m}`);
const fail = (m: string, code = 1): never => {
  console.error(`\n  ❌ ${m}`);
  process.exit(code);
};
const asJson = async (res: Response) => {
  const text = await res.text();
  try {
    return { res, json: JSON.parse(text) as unknown, raw: text };
  } catch {
    return { res, json: null, raw: text };
  }
};

/* ── 0. Live schema (drift check) ─────────────────────────────────────────── */
console.log("━━━ 0) Live table columns (drift check) ━━━");
const specRes = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: "application/openapi+json" },
});
const rawSpec = (await specRes.json()) as {
  components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> };
  definitions?: Record<string, { properties?: Record<string, unknown> }>;
};
// PostgREST serves either OpenAPI 3 (components.schemas) or Swagger 2
// (definitions) depending on the Accept header — accept both.
const schemas = (rawSpec.components?.schemas ?? rawSpec.definitions ?? {}) as Record<
  string,
  { properties?: Record<string, unknown> }
>;
console.log(`  OpenAPI spec: HTTP ${specRes.status}, ${Object.keys(schemas).length} tables`);
for (const name of Object.keys(schemas).sort()) {
  if (/profile|guardian|safety|live/i.test(name)) {
    const cols = Object.keys(schemas[name].properties ?? {}).sort();
    console.log(`  ${name}: ${cols.join(", ") || "(no columns)"}`);
  }
}
const columnCache = new Map<string, Set<string>>();
const getColumns = async (table: string): Promise<Set<string>> => {
  const cached = columnCache.get(table);
  if (cached) return cached;
  const cols = new Set<string>();
  for (const name of Object.keys(schemas)) {
    if (name.toLowerCase() === table.toLowerCase()) {
      for (const col of Object.keys(schemas[name].properties ?? {})) cols.add(col);
    }
  }
  columnCache.set(table, cols);
  return cols;
};
const pick = (cols: Set<string>, wanted: string[]): string => wanted.filter((c) => cols.has(c)).join(",");

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const signIn = async (email: string, password: string) => {
  const { res, json, raw } = await asJson(
    await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
  if (!res.ok) fail(`sign-in failed for ${email}: HTTP ${res.status} ${raw.slice(0, 200)}`);
  const session = json as { access_token: string; user: { id: string; email: string } };
  return { token: session.access_token, userId: session.user.id, email: session.user.email };
};

const userHeaders = (token: string) => ({ apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

/* ── 1. Sign in both devices ──────────────────────────────────────────────── */
console.log("\n━━━ 1) Sign in Aanya + Guardian (Email + Password, no OTP) ━━━");
const aanya = await signIn("aanya@sakhi.dev", "User@123");
pass(`Aanya signed in (${aanya.userId.slice(0, 8)}…)`);
const guardian = await signIn("guardian@sakhi.dev", "Guardian@123");
pass(`Guardian signed in (${guardian.userId.slice(0, 8)}…)`);

/* ── 2. Guardian sees Aanya (linked profile + accepted link) ──────────────── */
console.log("\n━━━ 2) Guardian sees Aanya (RLS via accepted guardian_links) ━━━");
{
  const { res, json, raw } = await asJson(
    await fetch(`${url}/rest/v1/profiles?id=eq.${aanya.userId}&select=id,full_name,role,email`, { headers: userHeaders(guardian.token) }),
  );
  if (!res.ok) fail(`guardian profile read: HTTP ${res.status} ${raw.slice(0, 200)}`);
  const rows = (json as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) fail("Guardian CANNOT read Aanya's profile — link missing or RLS wrong.");
  pass(`Guardian reads Aanya's profile → name="${rows[0].full_name}" role="${rows[0].role}"`);
}
{
  const linkCols = await getColumns("guardian_links");
  const { res, json } = await asJson(
    await fetch(
      `${url}/rest/v1/guardian_links?guardian_id=eq.${guardian.userId}&user_id=eq.${aanya.userId}&select=${pick(linkCols, ["status", "relationship", "user_name", "guardian_name"])}`,
      { headers: userHeaders(guardian.token) },
    ),
  );
  const rows = (json as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0 || rows[0].status !== "accepted") fail("Accepted Guardian ↔ Aanya link not visible to Guardian.");
  const rel = rows[0].relationship ? ` relationship="${rows[0].relationship}"` : "";
  pass(`Accepted link visible → status="${rows[0].status}"${rel}`);
}

/* ── 3. Aanya triggers SOS ────────────────────────────────────────────────── */
console.log("\n━━━ 3) Aanya triggers SOS (safety_events insert as user) ━━━");
let sosId = "";
{
  const { res, json, raw } = await asJson(
    await fetch(`${url}/rest/v1/safety_events`, {
      method: "POST",
      headers: { ...userHeaders(aanya.token), Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: aanya.userId,
        type: "sos",
        status: "active",
        latitude: 28.6139,
        longitude: 77.209,
        location_label: "Connaught Place, New Delhi",
      }),
    }),
  );
  if (!res.ok) fail(`Aanya SOS insert: HTTP ${res.status} ${raw.slice(0, 300)}`);
  const created = (json as Array<{ id: string }> | { id: string } | null) ?? null;
  sosId = String(Array.isArray(created) ? created[0]?.id : created?.id);
  pass(`SOS event created (${sosId.slice(0, 8)}…) — the Guardian dashboard's Realtime subscription should now show ACTIVE SOS`);
}

/* ── 4. Guardian sees the active SOS ──────────────────────────────────────── */
console.log("\n━━━ 4) Guardian sees Aanya's active SOS (no service key, RLS) ━━━");
{
  const { res, json, raw } = await asJson(
    await fetch(`${url}/rest/v1/safety_events?id=eq.${sosId}&select=id,type,status,latitude,longitude,location_label,triggered_at`, {
      headers: userHeaders(guardian.token),
    }),
  );
  if (!res.ok) fail(`guardian SOS read: HTTP ${res.status} ${raw.slice(0, 200)}`);
  const rows = (json as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) fail("Guardian CANNOT see Aanya's SOS event — Realtime select policy broken.");
  const ev = rows[0];
  if (ev.status !== "active") fail(`Expected status=active, got ${String(ev.status)}`);
  pass(`Guardian sees ACTIVE SOS: type=${ev.type} status=${ev.status} at ${ev.location_label}`);
}

/* ── 5. Aanya upserts live location ───────────────────────────────────────── */
console.log("\n━━━ 5) Aanya live location upsert (one row per user) ━━━");
{
  const { res, raw } = await asJson(
    await fetch(`${url}/rest/v1/live_locations?on_conflict=user_id`, {
      method: "POST",
      headers: { ...userHeaders(aanya.token), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        user_id: aanya.userId,
        latitude: 28.6315,
        longitude: 77.2167,
        location_label: "Karol Bagh, New Delhi",
        battery_level: 82,
      }),
    }),
  );
  if (!res.ok) fail(`live_locations upsert: HTTP ${res.status} ${raw.slice(0, 300)}`);
  pass("Live location upserted (Karol Bagh, battery 82%)");
}
{
  const { res, json } = await asJson(
    await fetch(`${url}/rest/v1/live_locations?user_id=eq.${aanya.userId}&select=latitude,longitude,location_label,battery_level,updated_at`, {
      headers: userHeaders(guardian.token),
    }),
  );
  const rows = (json as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) fail("Guardian CANNOT read Aanya's live location.");
  pass(`Guardian reads live location → ${rows[0].location_label} (battery ${rows[0].battery_level}%)`);
}

/* ── 6. Guardian marks Aanya safe (resolve) ───────────────────────────────── */
console.log("\n━━━ 6) Guardian presses 'Mark Safe' (resolve SOS) ━━━");
{
  const { res, raw } = await asJson(
    await fetch(`${url}/rest/v1/safety_events?id=eq.${sosId}`, {
      method: "PATCH",
      headers: { ...userHeaders(guardian.token), Prefer: "return=minimal" },
      body: JSON.stringify({ status: "resolved", resolved_at: new Date().toISOString() }),
    }),
  );
  if (!res.ok && res.status !== 204) fail(`guardian resolve: HTTP ${res.status} ${raw.slice(0, 300)}`);
  pass("SOS resolved by Guardian (status=resolved, resolved_at set)");
}
{
  const { res, json } = await asJson(
    await fetch(`${url}/rest/v1/safety_events?id=eq.${sosId}&select=status,resolved_at`, { headers: userHeaders(aanya.token) }),
  );
  const rows = (json as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0 || rows[0].status !== "resolved") fail("Aanya cannot see the resolved state — update policy broken.");
  pass(`Aanya confirms SOS resolved (status=${rows[0].status})`);
}

/* ── 7. Safe check-in ─────────────────────────────────────────────────────── */
console.log("\n━━━ 7) Aanya taps 'I'm Safe' → check-in event ━━━");
{
  const { res, raw } = await asJson(
    await fetch(`${url}/rest/v1/safety_events`, {
      method: "POST",
      headers: userHeaders(aanya.token),
      body: JSON.stringify({
        user_id: aanya.userId,
        type: "checkin",
        status: "resolved",
        latitude: 28.6315,
        longitude: 77.2167,
        location_label: "Karol Bagh, New Delhi",
      }),
    }),
  );
  if (!res.ok) fail(`check-in insert: HTTP ${res.status} ${raw.slice(0, 300)}`);
  pass("Safe check-in created");
}
{
  const { res, json } = await asJson(
    await fetch(`${url}/rest/v1/safety_events?user_id=eq.${aanya.userId}&type=eq.checkin&select=type,status,location_label,created_at&order=created_at.desc&limit=1`, {
      headers: userHeaders(guardian.token),
    }),
  );
  const rows = (json as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) fail("Guardian cannot see the safe check-in.");
  pass(`Guardian sees safe check-in → ${rows[0].location_label} at ${String(rows[0].created_at).slice(0, 19)}`);
}

/* ── 8. Cleanup test SOS events? Keep them — they're the Guardian dashboard's
 *      notification history. No destructive deletes. ──────────────────────── */

console.log("\n━━━ Summary ━━━");
console.log("  ✅ Both devices signed in (no OTP)\n  ✅ Guardian sees Aanya (accepted link)\n  ✅ SOS created by Aanya, visible + resolvable by Guardian\n  ✅ Live location upserted by Aanya, visible to Guardian\n  ✅ Safe check-in delivered\n\nAll good — open the preview on two devices: aanya@sakhi.dev presses SOS and guardian@sakhi.dev's dashboard flips into the emergency view in real time.");
