#!/usr/bin/env bun
/**
 * Sakhi AI — Resend SMTP probe
 * ---------------------------------------------------------------------------
 * GoTrue hides the real reason behind "Error sending confirmation email"
 * (HTTP 500) — the underlying SMTP failure is logged server-side only. This
 * probe talks DIRECTLY to smtp.resend.com and runs the same handshake
 * Supabase performs on every OTP email, printing every server reply verbatim:
 *
 *   banner → EHLO → (587 only: STARTTLS) → AUTH PLAIN → MAIL FROM → RCPT TO
 *
 * That isolates the exact cause:
 *   • 535 … Authentication failed  → the Resend API key in Auth → SMTP is wrong
 *   • 550 … Sender address rejected → the from-address isn't on a verified
 *     Resend domain (Resend rejects unverified senders)
 *   • 530 … Must issue MAIL first  → handshake sequencing problem
 *   • connect/timeout errors       → port or host blocked (try 465 instead)
 *
 * Usage (never sends an actual email — MAIL FROM/RCPT TO only, then QUIT):
 *
 *   RESEND_SMTP_PASSWORD=re_... RESEND_SENDER=otp@your-domain.com \
 *     bun run diagnose:smtp -- you@example.com
 *
 *   # or as flags (or a mix):
 *   bun run diagnose:smtp --recipient you@example.com \
 *     --sender otp@your-domain.com --password re_...
 *
 * The password is never printed — only its length and the server's replies.
 */

import { connect as netConnect } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* ── Args + env ──────────────────────────────────────────────────────────── */
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
const env = { ...parseEnvFile(".env"), ...parseEnvFile(".env.local"), ...(process.env as Record<string, string>) };

const flag = (name: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const recipient = flag("recipient") ?? process.argv.slice(2).find((a) => !a.startsWith("-")) ?? "";
const sender = flag("sender") ?? env.RESEND_SENDER ?? "";
const username = flag("username") ?? env.RESEND_SMTP_USERNAME ?? "resend";
const password = flag("password") ?? env.RESEND_SMTP_PASSWORD ?? "";
const host = flag("host") ?? env.RESEND_SMTP_HOST ?? "smtp.resend.com";

if (!recipient) {
  console.error("Usage: RESEND_SMTP_PASSWORD=re_... RESEND_SENDER=otp@your-domain.com bun run diagnose:smtp -- you@example.com");
  process.exit(1);
}
if (!password) {
  console.warn(
    "⚠ No RESEND_SMTP_PASSWORD / --password given — connectivity + banner + EHLO only.\n" +
      "  AUTH/MAIL FROM/RCPT TO will be skipped. Add your Resend API key to test credentials.",
  );
}
if (!sender) {
  console.warn("⚠ No RESEND_SENDER / --sender given — MAIL FROM/RCPT TO will be skipped.\n");
}

/* ── Minimal SMTP client (line-buffered, promise-based) ─────────────────── */
type Session = {
  greeting: () => Promise<string[]>;
  send: (cmd: string) => Promise<string[]>;
  close: () => void;
};

const openSession = (sock: ReturnType<typeof netConnect> | TLSSocket): Session => {
  let buffer = "";
  let pending: ((lines: string[]) => void) | null = null;

  const tryFlush = () => {
    if (!pending) return;
    const lines: string[] = [];
    for (;;) {
      const m = buffer.match(/^(\d{3})([ -])([^\r\n]*)\r\n/);
      if (!m) break;
      lines.push(`${m[1]}${m[2]}${m[3]}`);
      buffer = buffer.slice(m[0].length);
      if (m[2] === " ") {
        const resolve = pending;
        pending = null;
        resolve(lines);
        return;
      }
    }
  };

  sock.setTimeout(15000);
  sock.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    tryFlush();
  });
  const fail = (err: Error) => {
    if (pending) {
      const resolve = pending;
      pending = null;
      resolve([`<connection error: ${err.message}>`]);
    }
  };
  sock.on("error", fail);
  sock.on("close", () => fail(new Error("connection closed")));
  sock.on("timeout", () => fail(new Error("timeout")));

  return {
    greeting: () =>
      new Promise((resolve) => {
        if (pending) return resolve([`<busy>`]);
        pending = resolve;
      }),
    send: (cmd: string) =>
      new Promise((resolve) => {
        if (pending) return resolve([`<busy — previous command not answered>`]);
        pending = resolve;
        sock.write(`${cmd}\r\n`);
      }),
    close: () => sock.destroy(),
  };
};

const step = (label: string, lines: string[]): void => {
  console.log(`\n  ${label}`);
  for (const l of lines) console.log(`    ${l}`);
};

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

/* ── Probe one endpoint ──────────────────────────────────────────────────── */
const probe = async (port: number, startTls: boolean): Promise<void> => {
  console.log(`\n\n════════════════════════════════════════════════════════════`);
  console.log(`  ${host}:${port}  (${startTls ? "STARTTLS on 587" : "implicit TLS on 465"})`);
  console.log(`════════════════════════════════════════════════════════════`);

  const rawSock = startTls
    ? netConnect({ host, port })
    : tlsConnect({ host, port, servername: host, rejectUnauthorized: false });

  const session = openSession(rawSock);

  try {
    step("banner", await session.greeting());

    step("EHLO", await session.send("EHLO sakhi-diagnostics"));

    let current: Session = session;
    if (startTls) {
      const up = await session.send("STARTTLS");
      step("STARTTLS", up);
      if (!up[0]?.startsWith("220")) {
        console.log("\n  ✗ STARTTLS refused — cannot continue on this port.");
        return;
      }
      const tls = tlsConnect({ socket: rawSock, servername: host, rejectUnauthorized: false });
      current = openSession(tls);
      await new Promise((resolve) => tls.once("secureConnect", resolve));
      step("EHLO (after TLS)", await current.send("EHLO sakhi-diagnostics"));
    }

    if (!password) {
      console.log("\n  (skipping AUTH — no RESEND_SMTP_PASSWORD provided)");
    } else {
      step(`AUTH PLAIN (username "${username}", password length ${password.length})`, await current.send(`AUTH PLAIN ${b64(`\0${username}\0${password}`)}`));
    }

    if (sender) {
      step(`MAIL FROM:<${sender}>`, await current.send(`MAIL FROM:<${sender}>`));
      step(`RCPT TO:<${recipient}>`, await current.send(`RCPT TO:<${recipient}>`));
    } else {
      console.log("\n  (skipping MAIL FROM/RCPT TO — no RESEND_SENDER provided)");
    }

    step("QUIT", await current.send("QUIT"));
    current.close();
  } catch (err) {
    console.log(`\n  ✗ ${host}:${port} unreachable/failed:`, (err as Error).message);
  } finally {
    rawSock.destroy();
  }
};

/* ── Run both ports ──────────────────────────────────────────────────────── */
console.log(`Recipient: ${recipient}`);
console.log(`Sender:    ${sender || "(none — set RESEND_SENDER)"}`);
console.log(`Auth:      ${password ? `will AUTH with ${username} (key length ${password.length})` : "skipped"}\n`);

await probe(465, false); // implicit TLS
await probe(587, true); // STARTTLS

/* ── Verdict ─────────────────────────────────────────────────────────────── */
console.log(`\n\n── How to read the results ────────────────────────────────────`);
console.log(`  • 535 … Authentication failed  → the Resend API key pasted in`);
console.log(`      Supabase → Auth → SMTP is wrong. Create a fresh key in Resend`);
console.log(`      → API Keys (re_...) and re-save it.`);
console.log(`  • 550/553 … Sender address rejected → the from-address is NOT on a`);
console.log(`      domain verified in Resend → Domains. Verify the domain (DNS records)`);
console.log(`      or use an address on an already-verified domain.`);
console.log(`  • 530 … Must issue a MAIL command → handshake issue; re-check host/port.`);
console.log(`  • 235 on AUTH + 250 on MAIL FROM/RCPT TO → the credentials and sender`);
console.log(`      are VALID — the failure is elsewhere (see Supabase Auth logs, or the`);
console.log(`      Magic Link template / rate limits).`);
console.log(`  • Connection refused/timeout on both ports → port blocked by this network;`);
console.log(`      Supabase still uses what's configured in Auth → SMTP (465 or 587).`);
console.log(`──────────────────────────────────────────────────────────────────`);
