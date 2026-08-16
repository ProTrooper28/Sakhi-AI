#!/usr/bin/env bun
/**
 * Sakhi AI — seed development accounts
 * ---------------------------------------------------------------------------
 * DEVELOPMENT ONLY. Creates (or repairs) the three predefined dev accounts in
 * Supabase Auth and verifies the whole login chain the app uses:
 *
 *   1. Auth user created with email_confirm = true (no verification email,
 *      no OTP) + user_metadata { full_name, role }.
 *   2. `profiles` row created by the handle_new_user trigger (full_name,
 *      email, role; phone/aadhaar left NULL — not collected for dev users).
 *      If the trigger is missing, the script inserts the row itself.
 *   3. Sign-in check via the SAME password grant the app uses
 *      (POST /auth/v1/token?grant_type=password).
 *   4. Profile check as the signed-in user (PostgREST select — RLS lets a
 *      user read only their own row) → confirms the app can load the name
 *      and role after login.
 *
 * Accounts (idempotent — safe to re-run):
 *   Aanya     aanya@sakhi.dev      User@123      role: user     → /home
 *   Guardian  guardian@sakhi.dev   Guardian@123  role: parent   → /guardian
 *             (UI calls this role "Guardian"; the DB/app value is 'parent')
 *   Admin     admin@sakhi.dev      Admin@123     role: admin    → /home
 *             (admin uses the User app until an admin app exists)
 *
 * It also seeds ONE accepted guardian link so the two-device flow works out
 * of the box: Guardian (guardian@sakhi.dev) is linked to Aanya
 * (aanya@sakhi.dev) with relationship "Guardian", status accepted.
 *
 * Usage (from the repo root):
 *   bun run seed:dev
 *
 * Required env (paste into the project's Keys/API-keys tab — the service
 * role key is server-side only and must NOT be VITE_-prefixed):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Before the FIRST run, execute in the Supabase SQL Editor (in order):
 *   1. supabase/migrations/20260816010000_dev_admin_role.sql
 *      (profiles.role must accept 'admin')
 *   2. supabase/migrations/20260816020000_sos_realtime.sql
 *      (safety_events + live_locations tables, RLS, Realtime publication)
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* ── Env loading (process.env first — Bun auto-loads .env) ─────────────────── */
const parseEnvFile = (p: string): Record<string, string> => {
  try {
    const out: Record<string, string> = {};
    for (const line of readFileSync(resolve(process.cwd(), p), "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[t.slice(0, eq).trim()] = v;
    }
    return out;
  } catch {
    return {};
  }
};

const env = {
  ...parseEnvFile(".env"),
  ...parseEnvFile(".env.local"),
  ...(process.env as Record<string, string>),
};

const url = (env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const anonKey = env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const DEV_ACCOUNTS = [
  { name: "Aanya", email: "aanya@sakhi.dev", password: "User@123", role: "user", home: "/home" },
  // The UI labels this role "Guardian"; the app + DB store it as 'parent'.
  { name: "Guardian", email: "guardian@sakhi.dev", password: "Guardian@123", role: "parent", home: "/guardian" },
  { name: "Admin", email: "admin@sakhi.dev", password: "Admin@123", role: "admin", home: "/home" },
] as const;

const header = (label: string) => console.log(`\n━━━ ${label} ━━━`);

const fail = (msg: string, code = 1): never => {
  console.error(`\n\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(code);
};

if (!url || !anonKey) {
  fail("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Add them to the Keys tab first.");
}
if (!serviceKey) {
  fail(
    "Missing SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  The anon key cannot create confirmed users, so seeding needs the service role key.\n" +
      "  Paste it into the project's Keys/API-keys tab as SUPABASE_SERVICE_ROLE_KEY\n" +
      "  (Supabase Dashboard → Project Settings → API → service_role secret).\n" +
      "  Do NOT prefix it with VITE_ — it must never reach the browser bundle.",
    2,
  );
}

const adminHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};
const anonHeaders = {
  apikey: anonKey,
  "Content-Type": "application/json",
};

const asJson = async (res: Response) => {
  const text = await res.text();
  try {
    return { res, json: JSON.parse(text) as Record<string, unknown> | Record<string, unknown>[], raw: text };
  } catch {
    return { res, json: null as unknown, raw: text };
  }
};

/* ── 1. Project reachable + email auth enabled ────────────────────────────── */
header("1) Supabase project + auth settings");
let settingsJson: Record<string, unknown> | null = null;
try {
  const { res, json, raw } = await asJson(await fetch(`${url}/auth/v1/settings`, { headers: anonHeaders }));
  console.log(`GET /auth/v1/settings → HTTP ${res.status}`);
  if (!res.ok) fail(`Project unreachable or anon key rejected:\n${raw.slice(0, 400)}`);
  settingsJson = json as Record<string, unknown>;
  const ext = (settingsJson?.external ?? {}) as Record<string, unknown>;
  console.log(`  Email auth enabled:  ${ext.email === true ? "YES ✅" : "NO ❌ (Auth → Providers → Email must be ON)"}`);
  console.log(`  Sign-ups allowed:    ${settingsJson?.disable_signup === false ? "YES ✅" : "NO ❌ (Auth → Sign In / Up → allow new users)"}`);
} catch (err) {
  fail(`Network error reaching ${url} — project paused or URL wrong? ${(err as Error).message}`);
}

/* ── 2. Upsert each dev account ───────────────────────────────────────────── */
header("2) Create / repair dev accounts in Supabase Auth");

type AdminUser = { id: string; email: string; email_confirmed_at?: string | null };
const findByEmail = (list: AdminUser[], email: string) => list.find((u) => u.email?.toLowerCase() === email);

// GoTrue returns a bare array on older versions and { users: [...] } on newer
// ones — normalize both so the script works against any project version.
const asUserList = (json: unknown): AdminUser[] => {
  if (Array.isArray(json)) return json as AdminUser[];
  if (json && typeof json === "object") {
    const users = (json as Record<string, unknown>).users;
    if (Array.isArray(users)) return users as AdminUser[];
  }
  return [];
};

for (const acct of DEV_ACCOUNTS) {
  console.log(`\n• ${acct.name} <${acct.email}> (role: ${acct.role})`);

  // a) Does the user already exist? (Earlier OTP-testing may have left one.)
  let existing: AdminUser | undefined;
  try {
    const { res, json, raw } = await asJson(
      await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers: adminHeaders }),
    );
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        fail("Service role key rejected by Supabase (401/403) — check the key in the Keys tab.", 3);
      }
      fail(`List users failed (HTTP ${res.status}):\n${raw.slice(0, 400)}`);
    }
    existing = findByEmail(asUserList(json), acct.email.toLowerCase());
  } catch (err) {
    fail(`List users request failed: ${(err as Error).message}`);
  }

  if (existing) {
    // b) Update password + metadata + force email confirmed (fixes accounts
    //    created unconfirmed during earlier OTP testing).
    const { res, json, raw } = await asJson(
      await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
        method: "PUT",
        headers: adminHeaders,
        body: JSON.stringify({
          email: acct.email,
          password: acct.password,
          email_confirm: true,
          user_metadata: { full_name: acct.name, role: acct.role },
        }),
      }),
    );
    if (!res.ok) {
      console.error(`  ✗ Update failed (HTTP ${res.status}): ${raw.slice(0, 400)}`);
      process.exit(1);
    }
    console.log(`  Updated existing user ${existing.id} (password, metadata, email confirmed)`);
  } else {
    // b) Create confirmed user — the handle_new_user trigger creates the
    //    profile row from user_metadata.
    const { res, json, raw } = await asJson(
      await fetch(`${url}/auth/v1/admin/users`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          email: acct.email,
          password: acct.password,
          email_confirm: true,
          user_metadata: { full_name: acct.name, role: acct.role },
        }),
      }),
    );
    if (!res.ok) {
      const body = raw.toLowerCase();
      if (body.includes("check constraint") || body.includes("23514") || body.includes("profiles_role_check")) {
        console.error(`  ✗ HTTP ${res.status}: ${raw.slice(0, 400)}`);
        fail(
          "The profiles.role CHECK constraint does not allow 'admin' yet.\n" +
            "Run supabase/migrations/20260816010000_dev_admin_role.sql in the Supabase SQL Editor, then re-run `bun run seed:dev`.",
        );
      }
      console.error(`  ✗ Create failed (HTTP ${res.status}): ${raw.slice(0, 400)}`);
      process.exit(1);
    }
    const created = (json as AdminUser);
    console.log(`  Created user ${created.id} (email confirmed, no verification email sent)`);
  }
}

/* ── 3. Verify profile rows (create if the trigger didn't) ────────────────── */
header("3) Verify profiles rows");

const serviceRestHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

// Introspect the LIVE table columns (older projects may lack columns added by
// later migrations) so every request only touches columns that actually exist.
const columnCache = new Map<string, Set<string>>();
const getColumns = async (table: string): Promise<Set<string>> => {
  const cached = columnCache.get(table);
  if (cached) return cached;
  const cols = new Set<string>();
  try {
    const specRes = await fetch(`${url}/rest/v1/`, {
      headers: { ...serviceRestHeaders, Accept: "application/openapi+json" },
    });
    if (specRes.ok) {
      const spec = (await specRes.json()) as {
        components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> };
      };
      const schemas = spec.components?.schemas ?? {};
      for (const name of Object.keys(schemas)) {
        if (name.toLowerCase() === table.toLowerCase()) {
          for (const col of Object.keys(schemas[name].properties ?? {})) cols.add(col);
        }
      }
    }
  } catch {
    /* fall through to empty set — callers handle missing columns gracefully */
  }
  columnCache.set(table, cols);
  return cols;
};

const profilesCols = await getColumns("profiles");
const profileSelect = ["id", "full_name", "email", "role"]
  .filter((c) => profilesCols.has(c))
  .join(",");

for (const acct of DEV_ACCOUNTS) {
  const { res, json, raw } = await asJson(
    await fetch(`${url}/rest/v1/profiles?email=eq.${encodeURIComponent(acct.email)}&select=${profileSelect}`, {
      headers: serviceRestHeaders,
    }),
  );
  if (!res.ok) {
    console.error(`  ✗ profile query failed (HTTP ${res.status}): ${raw.slice(0, 300)}`);
    process.exit(1);
  }
  const rows = (json as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    // Trigger missing/old — look up the auth user id, then insert the row
    // directly (service role bypasses RLS).
    const listRes = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers: adminHeaders });
    const list = asUserList(await listRes.json());
    const user = findByEmail(list, acct.email.toLowerCase());
    if (!user) {
      console.error(`  ✗ ${acct.email}: auth user not found — aborting.`);
      process.exit(1);
    }
    const { res: insRes, raw: insRaw } = await asJson(
      await fetch(`${url}/rest/v1/profiles?on_conflict=id`, {
        method: "POST",
        headers: { ...serviceRestHeaders, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          id: user.id,
          full_name: acct.name,
          email: acct.email.toLowerCase(),
          role: acct.role,
        }),
      }),
    );
    if (!insRes.ok) {
      console.error(`  ✗ ${acct.email}: profile insert failed (HTTP ${insRes.status}): ${insRaw.slice(0, 300)}`);
      process.exit(1);
    }
    console.log(`  ${acct.email}: profile was missing → inserted (trigger not present).`);
    continue;
  }
  const row = rows[0] as Record<string, unknown>;
  console.log(`  ${acct.email}: profile OK → name="${row.full_name}" role="${row.role}" (id ${String(row.id).slice(0, 8)}…)`);
  if (row.role !== acct.role) {
    console.error(`  ✗ role mismatch — expected "${acct.role}", got "${String(row.role)}".`);
    process.exit(1);
  }
}

/* ── 3b. Realtime tables present? (safety_events / live_locations) ────────── */
header("3b) Realtime tables");
for (const table of ["safety_events", "live_locations", "guardian_links"]) {
  const { res } = await asJson(
    await fetch(`${url}/rest/v1/${table}?limit=1`, { headers: serviceRestHeaders }),
  );
  if (res.ok) {
    console.log(`  ${table}: OK ✅`);
  } else {
    console.error(`  ${table}: missing or blocked (HTTP ${res.status})`);
    fail(
      `Table \`${table}\` was not found. Run the migrations in the Supabase SQL Editor:\n` +
        `  • supabase/migrations/20260816020000_sos_realtime.sql (safety_events, live_locations, guardian_links + Realtime)\n` +
        `  • supabase/migrations/20260815000000_create_auth_tables.sql (if guardian_links is still missing)`,
    );
  }
}

/* ── 3c. Seed the accepted Guardian → Aanya link ───────────────────────────── */
header("3c) Guardian ↔ Aanya link (accepted)");

const profileByEmail = async (email: string): Promise<string | null> => {
  const { res, json } = await asJson(
    await fetch(`${url}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`, {
      headers: serviceRestHeaders,
    }),
  );
  if (!res.ok) return null;
  const rows = (json as Array<Record<string, unknown>>) ?? [];
  return rows.length > 0 ? String(rows[0].id) : null;
};

const guardianId = await profileByEmail("guardian@sakhi.dev");
const aanyaId = await profileByEmail("aanya@sakhi.dev");
if (!guardianId || !aanyaId) {
  fail("Could not resolve Guardian/Aanya profile ids — re-run after step 3 passes.");
}

// Only include optional columns if the live table has them (older projects
// predate relationship / guardian_name / user_name). The core SOS + live
// location flow only needs guardian_id + user_id + status.
const linkCols = await getColumns("guardian_links");
const linkRow: Record<string, unknown> = {
  guardian_id: guardianId,
  user_id: aanyaId,
  status: "accepted",
};
if (linkCols.has("relationship")) linkRow.relationship = "Guardian";
if (linkCols.has("guardian_name")) linkRow.guardian_name = "Guardian";
if (linkCols.has("user_name")) linkRow.user_name = "Aanya";

const { res: linkRes, raw: linkRaw } = await asJson(
  await fetch(`${url}/rest/v1/guardian_links?on_conflict=guardian_id,user_id`, {
    method: "POST",
    headers: { ...serviceRestHeaders, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(linkRow),
  }),
);
if (!linkRes.ok) {
  console.error(`  ✗ link insert failed (HTTP ${linkRes.status}): ${linkRaw.slice(0, 300)}`);
  process.exit(1);
}
console.log(`  Guardian (${guardianId.slice(0, 8)}…) ↔ Aanya (${aanyaId.slice(0, 8)}…) — accepted ✅`);

/* ── 4. End-to-end login check (exactly what the app does) ────────────────── */
header("4) Sign in with Email + Password, load profile as the user");

const results: Array<{ email: string; role: string; home: string; pass: boolean; note: string }> = [];

for (const acct of DEV_ACCOUNTS) {
  const { res, json, raw } = await asJson(
    await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: anonHeaders,
      body: JSON.stringify({ email: acct.email, password: acct.password }),
    }),
  );
  if (!res.ok) {
    results.push({ email: acct.email, role: acct.role, home: acct.home, pass: false, note: `sign-in failed: ${raw.slice(0, 160)}` });
    console.log(`  ✗ ${acct.email}: HTTP ${res.status} — ${raw.slice(0, 160)}`);
    continue;
  }
  const session = json as { access_token?: string; user?: { id?: string; email?: string } };
  const token = session.access_token ?? "";
  const userId = session.user?.id ?? "";

  const profileRes = await fetch(
    `${url}/rest/v1/profiles?id=eq.${userId}&select=id,full_name,email,role`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } },
  );
  const profileRows = (await profileRes.json()) as Array<Record<string, unknown>>;
  const profile = profileRows[0] as Record<string, unknown> | undefined;

  const roleOk = profile?.role === acct.role;
  const nameOk = profile?.full_name === acct.name;
  const ok = roleOk && nameOk && Boolean(token);
  results.push({
    email: acct.email,
    role: String(profile?.role ?? "?"),
    home: acct.home,
    pass: ok,
    note: ok ? "" : `profile role=${String(profile?.role)} name=${String(profile?.full_name)}`,
  });
  console.log(
    `  ${ok ? "✅ PASS" : "❌ FAIL"}  ${acct.email}  →  sign-in ${token ? "ok" : "no-token"}, profile role=${String(profile?.role ?? "?")}, name=${String(profile?.full_name ?? "?")}`,
  );
}

/* ── 5. Summary ───────────────────────────────────────────────────────────── */
header("5) Summary");
let passed = 0;
for (const r of results) {
  console.log(`  ${r.pass ? "✅" : "❌"}  ${r.email.padEnd(20)} role=${r.role.padEnd(7)} → ${r.home}${r.pass ? "" : `   (${r.note})`}`);
  if (r.pass) passed++;
}
console.log(`\n${passed}/${results.length} dev accounts verified.`);
console.log("\nUse these in the app: Sign In → Email + Password (no OTP).");
console.log("Guardian ↔ Aanya link: seeded (accepted). SOS + live location use Supabase Realtime.");
if (passed === results.length) {
  console.log("All good — open the preview, sign in as aanya@sakhi.dev / guardian@sakhi.dev / admin@sakhi.dev.");
} else {
  console.log("Some checks failed — the ✗ lines above show the exact backend response.");
  process.exit(1);
}
