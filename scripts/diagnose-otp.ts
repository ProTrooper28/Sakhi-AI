#!/usr/bin/env bun
/**
 * Sakhi AI — Email OTP diagnostics
 * ---------------------------------------------------------------------------
 * Exercises the EXACT request the app makes (supabase.auth.signInWithOtp →
 * POST {url}/auth/v1/otp with create_user + metadata) against your Supabase
 * project and prints the raw backend response — no friendly rewording. This
 * surfaces the real SMTP / auth error (message, HTTP status, GoTrue error
 * code) that the app currently hides behind "We couldn't send the code to
 * that email."
 *
 * Usage (from the repo root — keys are already in .env / .env.local):
 *   bun run diagnose:otp -- you@example.com
 *   # or
 *   bun scripts/diagnose-otp.ts you@example.com
 *
 * What it verifies:
 *   1. The Supabase project URL / anon key are present and reachable.
 *   2. Email authentication is enabled  (GET /auth/v1/settings → external.email).
 *   3. New sign-ups are allowed        (GET /auth/v1/settings → disable_signup).
 *   4. The OTP send itself: HTTP status + raw JSON body (SMTP errors, rate
 *      limits, "Signup not allowed", sender rejections all appear verbatim).
 *
 * SMTP items the client API cannot inspect directly (see the printed
 * checklist too):
 *   - Custom SMTP is ON and points at Resend:    Supabase → Auth → SMTP.
 *   - Resend API key is valid:                   Resend → API Keys.
 *   - Sender address is verified:                Resend → Domains — the
 *     from-address must be on a domain you verified with Resend (no
 *     onbo@resend.dev in production).
 *
 * NOTE: running this sends a real OTP email to the address you pass.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* ── Load env: process.env first (Bun auto-loads .env), fall back to parsing ── */
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

const emailArg = process.argv.slice(2).find((a) => !a.startsWith("-")) ?? "";
const email = emailArg.trim().toLowerCase();

const header = (name: string, value: string) => console.log(`\n\x1b[1m━━━ ${name} \x1b[0m`);

if (!url || !anonKey) {
  console.error(
    "\x1b[31mMissing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.\x1b[0m\n" +
      "Add them to .env / .env.local (or the Keys tab) first, then re-run.\n" +
      "The anon key is public — it only gates access to this project's public data.",
  );
  process.exit(1);
}

if (!email) {
  console.error("Usage: bun run diagnose:otp -- you@example.com");
  process.exit(1);
}

const headers = {
  apikey: anonKey,
  "Content-Type": "application/json",
};

console.log(`Target project: ${url}\nSending OTP to: ${email}\n`);

/* ── 1. Auth settings (email enabled? sign-ups allowed?) ─────────────────── */
header("1) GET /auth/v1/settings — auth configuration");
try {
  const res = await fetch(`${url}/auth/v1/settings`, { headers });
  const raw = await res.text();
  console.log(`HTTP ${res.status}`);
  console.log(raw || "(empty body)");

  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(raw);
  } catch {
    /* keep raw */
  }
  const ext = (json?.external ?? {}) as Record<string, unknown>;
  console.log("\n→ Email auth enabled:", ext.email === true ? "YES ✅" : "NO ❌ (Auth → Providers → Email must be ON)");
  console.log("→ New sign-ups allowed:", json?.disable_signup === false ? "YES ✅" : "NO ❌ (Auth → Sign In / Up → “Allow new users to sign up”)");
} catch (err) {
  console.error("✗ Request failed (project URL wrong? project paused?):", err);
  process.exit(1);
}

/* ── 2. The exact failing request: POST /auth/v1/otp ─────────────────────── */
header("2) POST /auth/v1/otp — the exact OTP request the app sends");
console.log("Payload: { email, create_user: true, data: { full_name, role, phone } }");

const payload = {
  email,
  create_user: true,
  data: {
    full_name: "Sakhi Diagnostics",
    role: "user",
    phone: "+910000000000",
  },
};

try {
  const res = await fetch(`${url}/auth/v1/otp`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  console.log(`HTTP ${res.status}`);
  console.log("Response body (RAW — this is the real backend error/message):");
  console.log(raw || "(empty body)");

  /* ── Interpretation guide ─────────────────────────────────────────────── */
  const body = raw.toLowerCase();
  console.log("\n── Interpretation ──────────────────────────────────────────");
  if (res.ok) {
    console.log("✅ 200 — the OTP pipeline works: Supabase accepted the request and");
    console.log("   SMTP delivered (or queued) the email. If no email arrives:");
    console.log("   • check Spam/Junk,");
    console.log("   • confirm the Magic Link template contains {{ .Token }},");
    console.log("   • confirm the sender address is a verified Resend domain.");
  } else if (res.status === 429 || body.includes("rate limit")) {
    console.log("⏳ Rate limited — wait ~60 s and retry. SMTP is almost certainly fine.");
  } else if (body.includes("signup not allowed")) {
    console.log("🚫 Sign-ups are disabled. Supabase → Auth → Sign In / Up →");
    console.log("   enable “Allow new users to sign up”, then retry.");
  } else if (body.includes("email_provider_disabled") || body.includes("smtp")) {
    console.log("📧 Email provider / SMTP problem:");
    console.log("   • Supabase → Auth → SMTP: enable “Custom SMTP” and point it at");
    console.log("     Resend (host smtp.resend.com, port 465, username resend, password = API key).");
    console.log("   • If it says the provider is disabled, custom SMTP is OFF — that");
    console.log("     is likely the root cause.");
  } else if (body.includes("535") || body.includes("authentication failed") || body.includes("invalid login")) {
    console.log("🔑 SMTP credentials invalid — the Resend API key in Auth → SMTP is wrong.");
  } else if (body.includes("550") || body.includes("sender") || body.includes("from")) {
    console.log("📨 Sender address rejected — the from-address must belong to a domain");
    console.log("   verified in Resend (Domains tab), e.g. otp@sakhi.example.com.");
  } else {
    console.log("❓ Unrecognized backend error — the raw body above is the exact error");
    console.log("   the app now shows in the UI and console ([sakhi-auth] logs).");
  }
  console.log("──────────────────────────────────────────────────────────────");
} catch (err) {
  console.error("✗ Request failed — network error, wrong project URL, or project paused:", err);
  process.exit(1);
}

/* ── 3. Dashboard checklist for the items only you can see ───────────────── */
header("3) Manual checks (Supabase + Resend dashboards)");
console.log(`  [ ] Supabase → Auth → SMTP: “Custom SMTP” ENABLED (Resend: smtp.resend.com:465, username "resend", password = Resend API key)`);
console.log(`  [ ] Supabase → Auth → Sign In / Up: “Allow new users to sign up” ENABLED`);
console.log(`  [ ] Supabase → Auth → Email Templates → Magic Link contains {{ .Token }}`);
console.log(`  [ ] Resend → API Keys: a valid key (re_...) is pasted into Auth → SMTP`);
console.log(`  [ ] Resend → Domains: the sender domain is verified (DNS) and the from-address`);
console.log(`      in Auth → SMTP is on that domain (no onbo@resend.dev in production)`);
console.log(`  [ ] The from-address in Supabase Auth → SMTP matches a real address on the`);
console.log(`      verified domain (Resend rejects unverified senders)`);
