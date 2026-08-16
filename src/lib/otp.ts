import { supabase, isSupabaseConfigured } from "./supabase";
import type { Role, OtpProfilePayload } from "./auth-types";

/**
 * Client-side helpers for Supabase Auth (Sakhi AI).
 *
 * Account creation uses Supabase's BUILT-IN email verification flow — no
 * custom OTP logic, no SMS, no custom SMTP:
 *
 *   - signUpWithEmail         → supabase.auth.signUp({ email, password, data })
 *                               Supabase's built-in email provider sends a
 *                               "Confirm signup" email with a verification
 *                               LINK. No 6-digit code is involved — the user
 *                               opens the link and is signed straight in
 *                               (implicit flow, detectSessionInUrl).
 *   - resendVerificationEmail → supabase.auth.resend({ type: "signup" })
 *                               re-sends the verification link.
 *
 * The user sets their REAL password on the Create Password screen that runs
 * right after verification (supabase.auth.updateUser). signUp is called with
 * a random throwaway password so the auth user is always created the standard
 * way; the user never sees it.
 *
 * The registration metadata (full name, role, phone) is passed as
 * `options.data`, which Supabase stores in `auth.users.raw_user_meta_data`;
 * a database trigger copies it into the `profiles` table. The phone number is
 * stored on the profile at signup so the flow can later be migrated to
 * phone/SMS OTP — and used for SOS alerts — without changing the rest of the
 * app.
 *
 * Normal sign-in (SignInPage) is EMAIL OR MOBILE + PASSWORD via
 * signInWithPassword — never OTP.
 */

export class OtpError extends Error {
  code: string;
  /** HTTP status returned by the Supabase Auth (GoTrue) endpoint, when present. */
  status?: number;
  /** GoTrue error_code (e.g. "email_provider_disabled"). */
  supabaseCode?: string;
  constructor(message: string, code: string, extra?: { status?: number; supabaseCode?: string }) {
    super(message);
    this.name = "OtpError";
    this.code = code;
    this.status = extra?.status;
    this.supabaseCode = extra?.supabaseCode;
  }
}

/** Shape of a Supabase Auth error (GoTrue). */
type AuthErrorLike = {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
};

/**
 * Log the COMPLETE error returned by a Supabase Auth call — message, HTTP
 * status and GoTrue error code — plus the full error object, so backend
 * failures (email provider, rate limits, disabled sign-ups) are never hidden
 * behind a generic UI message. Look for "[sakhi-auth]" in the browser console.
 */
const logRawAuthError = (tag: string, error: unknown): void => {
  const e = (error ?? {}) as AuthErrorLike;
  console.error(
    `[sakhi-auth] ${tag}`,
    JSON.stringify(
      {
        message: e.message ?? "(no message)",
        status: e.status ?? "(no status)",
        code: e.code ?? "(no code)",
        name: e.name ?? "(no name)",
      },
      null,
      2,
    ),
  );
  console.error(`[sakhi-auth] ${tag} — full error object:`, error);
};

/**
 * Format the REAL Supabase error for the UI — no generic rewording. The
 * backend message is kept verbatim and the HTTP status / GoTrue code are
 * appended so the exact failing request is identifiable.
 */
const realBackendMessage = (error: AuthErrorLike): string => {
  const bits = [error.message ?? "Unknown Supabase Auth error"];
  const detail: string[] = [];
  if (error.status !== undefined) detail.push(`status ${error.status}`);
  if (error.code) detail.push(`code "${error.code}"`);
  if (detail.length > 0) bits.push(`(${detail.join(", ")})`);
  return bits.join(" ");
};

/** Normalize an Indian mobile number to E.164 (+91XXXXXXXXXX). */
export const normalizePhone = (raw: string): string => {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return `+${digits}`;
};

/** Basic phone validation (10-digit Indian mobile). */
export const isValidIndianMobile = (raw: string): boolean =>
  /^[6-9]\d{9}$/.test(raw.replace(/[^\d]/g, "").slice(-10));

/** Basic email validation. */
export const isValidEmail = (raw: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());

/** Ensure the Supabase backend is wired up, or throw a friendly error. */
const requireBackend = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new OtpError(
      "Backend is not configured yet. Ask your developer to connect Supabase, or continue as a Guest.",
      "NOT_CONFIGURED",
    );
  }
  return supabase;
};

/** Registration metadata stored on the auth user (the DB trigger copies it into profiles). */
const buildMetadata = (role: Role, profile?: OtpProfilePayload) =>
  profile
    ? { full_name: profile.full_name, role, phone: profile.phone }
    : { role };

/**
 * Pending-signup marker. Written when Create Account submits, cleared once
 * the user has created their password. It lets the app tell a freshly
 * verified account (needs the Create Password step) apart from a returning
 * user (goes straight to their dashboard).
 */
const PENDING_SIGNUP_KEY = "sakhi_pending_signup";

export type PendingSignup = { email: string; role: Role };

export const savePendingSignup = (email: string, role: Role): void => {
  try {
    localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify({ email, role }));
  } catch {
    // storage unavailable — the flow still works, just without the shortcut
  }
};

export const readPendingSignup = (): PendingSignup | null => {
  try {
    const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSignup;
    if (!parsed?.email) return null;
    return { email: parsed.email, role: parsed.role === "parent" ? "parent" : "user" };
  } catch {
    return null;
  }
};

export const clearPendingSignup = (): void => {
  try {
    localStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch {
    // ignore storage errors
  }
};

/** Random throwaway password so the auth user is always created the standard way. */
const randomPassword = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

/**
 * Create the Supabase Auth account for a brand-new user (User or Guardian).
 *
 * Calls `signUp` with the onboarding metadata and a throwaway password.
 * Supabase's BUILT-IN email provider sends a "Confirm signup" email with a
 * verification LINK; clicking it verifies the email and signs the user in
 * (implicit flow — the session arrives in the URL and is picked up by
 * `detectSessionInUrl`). The user then lands on the Create Password step.
 *
 * Dashboard requirements (done once in the Supabase dashboard):
 *   • Auth → Sign In / Up → "Allow new users to sign up" ENABLED.
 *   • Auth → Providers → Email → "Confirm email" ENABLED (the default) so a
 *     verification email is sent.
 *   • Auth → URL Configuration → Site URL = this app's URL (the verification
 *     link redirects back to it; we also pass it explicitly as
 *     `emailRedirectTo`).
 *   • Auth → SMTP → Custom SMTP OFF so the built-in provider is used.
 */
export const signUpWithEmail = async (params: {
  email: string;
  role: Role;
  profile?: OtpProfilePayload;
}): Promise<void> => {
  const client = requireBackend();
  const email = params.email.trim().toLowerCase();

  try {
    const { error } = await client.auth.signUp({
      email,
      // Throwaway — the user sets their real password on the Create Password
      // screen after verification (updateUser overwrites this).
      password: randomPassword(),
      options: {
        data: buildMetadata(params.role, params.profile),
        emailRedirectTo: window.location.origin,
      },
    });
    if (!error) return;

    const m = (error.message ?? "").toLowerCase();
    if (m.includes("already") || m.includes("registered")) {
      throw new OtpError(
        "An account with this email already exists. Please sign in instead.",
        "ALREADY_REGISTERED",
        { status: error.status, supabaseCode: error.code },
      );
    }
    if (m.includes("signup") || m.includes("not allowed")) {
      logRawAuthError("signUp blocked — new sign-ups may be disabled", error);
      throw new OtpError(
        "New sign-ups appear to be disabled for this app. Ask your developer to enable “Allow new users to sign up” in Supabase Auth → Sign In / Up, then try again.",
        "SIGNUP_DISABLED",
        { status: error.status, supabaseCode: error.code },
      );
    }
    // Anything else (email provider failure, rate limit, invalid email, …) is
    // surfaced VERBATIM — message + HTTP status + GoTrue code.
    logRawAuthError("signUp failed", error);
    throw new OtpError(realBackendMessage(error), "SIGNUP_ERROR", {
      status: error.status,
      supabaseCode: error.code,
    });
  } catch (err) {
    if (err instanceof OtpError) throw err;
    throw new OtpError("Network error. Please check your connection and try again.", "NETWORK_ERROR");
  }
};

/**
 * Re-send the "Confirm signup" verification email for an account that has not
 * been verified yet (the Verify Email screen's Resend button).
 */
export const resendVerificationEmail = async (params: { email: string }): Promise<void> => {
  const client = requireBackend();
  const email = params.email.trim().toLowerCase();

  try {
    const { error } = await client.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (!error) return;

    const m = (error.message ?? "").toLowerCase();
    if (m.includes("confirm") || m.includes("already")) {
      throw new OtpError(
        "This email is already verified. Try signing in instead.",
        "ALREADY_CONFIRMED",
        { status: error.status, supabaseCode: error.code },
      );
    }
    logRawAuthError("resend verification email failed", error);
    throw new OtpError(realBackendMessage(error), "RESEND_ERROR", {
      status: error.status,
      supabaseCode: error.code,
    });
  } catch (err) {
    if (err instanceof OtpError) throw err;
    throw new OtpError("Network error. Please check your connection and try again.", "NETWORK_ERROR");
  }
};

/**
 * Resolve a sign-in identifier to an account email. Emails pass through
 * as-is; mobile numbers are normalized to E.164 and resolved via the
 * `lookup_email_by_phone` SECURITY DEFINER RPC (profiles.phone is hidden by
 * RLS for a signed-out visitor, so a plain query cannot see it).
 */
export const resolveLoginEmail = async (identifier: string): Promise<string> => {
  const client = requireBackend();
  const trimmed = identifier.trim();
  if (isValidEmail(trimmed)) return trimmed.toLowerCase();
  if (isValidIndianMobile(trimmed)) {
    const phone = normalizePhone(trimmed);
    const { data, error } = await client.rpc("lookup_email_by_phone", { p_phone: phone });
    if (error) {
      logRawAuthError("lookup_email_by_phone RPC failed", error);
      throw new OtpError("We couldn't find an account for that mobile number.", "PHONE_LOOKUP_FAILED");
    }
    if (!data) {
      throw new OtpError(
        "No Sakhi AI account found for this mobile number. Create an account instead.",
        "NO_ACCOUNT",
      );
    }
    return String(data).toLowerCase();
  }
  throw new OtpError("Enter a valid email address or 10-digit mobile number.", "INVALID_IDENTIFIER");
};
