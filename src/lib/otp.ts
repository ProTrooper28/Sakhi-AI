import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { Role, OtpProfilePayload } from "./auth-types";

/**
 * Client-side helpers for the Email OTP sign-in flow.
 *
 * Everything goes through Supabase Auth's built-in passwordless email flow —
 * there is no custom OTP logic, no magic-link exchange, and no email
 * confirmation links:
 *
 *   - sendOtp       → supabase.auth.signInWithOtp({ email })
 *                     (a 6-digit numeric code is emailed — this requires the
 *                     Magic Link email template to include {{ .Token }}; see
 *                     the README / Supabase docs "Passwordless email logins")
 *   - verifyOtpCode → supabase.auth.verifyOtp({ email, token, type: "email" })
 *                     (returns a session directly and confirms the email)
 *
 * The registration metadata (full name, role, phone) is passed as
 * `options.data`, which Supabase stores in `auth.users.raw_user_meta_data`;
 * a database trigger copies it into the `profiles` table. The phone number is
 * stored on the profile at signup so the flow can later be migrated to
 * phone/SMS OTP — and used for SOS alerts — without changing the rest of the
 * app.
 *
 * The channel is intentionally isolated behind these two functions:
 * swapping Email OTP for Phone OTP later only means changing the payload key
 * (`email` → `phone`), the `type` ("email" → "sms"), and the dashboard
 * configuration — every caller stays the same.
 */

export class OtpError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "OtpError";
    this.code = code;
  }
}

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
 * True when Supabase refused the OTP send because the email has no account
 * (sign-in mode) or because new sign-ups are blocked (sign-up mode). GoTrue
 * reports both as "Signup not allowed for otp".
 */
const isSignupBlockedError = (message: string): boolean => {
  const m = message.toLowerCase();
  return m.includes("signup") || m.includes("not allowed") || m.includes("no user");
};

/** Map common Supabase Auth errors to friendly, safe messages. */
const toFriendlyError = (message: string): string => {
  const m = message.toLowerCase();
  // Send-time "Signup not allowed for otp" must not be mislabeled as a wrong
  // code — sendOtp intercepts this before reaching here, this is defensive.
  if (m.includes("signup") || m.includes("not allowed")) {
    return "We couldn't create your account. New sign-ups may be disabled for this app — please contact the developer.";
  }
  if (m.includes("otp") || m.includes("token") || m.includes("code")) {
    return "Incorrect OTP. Please try again.";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (m.includes("network") || m.includes("failed to fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  if (m.includes("email")) {
    return "We couldn't send the code to that email. Please check the address and try again.";
  }
  return message;
};

/**
 * Explicitly create the Supabase Auth user (sign-up flow) when the lazy OTP
 * creation is refused. Uses a throwaway random password — the user always
 * authenticates with the emailed code, and the optional password set on the
 * first-login Profile Completion screen replaces it. Throws a friendly
 * OtpError when sign-ups are fully disabled for the project.
 */
const ensureAuthUserCreated = async (
  client: SupabaseClient,
  email: string,
  metadata: { full_name?: string; role: Role; phone?: string },
): Promise<void> => {
  // 24+ random alphanumeric chars — never shown to anyone.
  const throwawayPassword = Array.from({ length: 3 }, () =>
    Math.random().toString(36).slice(2, 10),
  ).join("");
  const { error } = await client.auth.signUp({
    email,
    password: throwawayPassword,
    options: { data: metadata },
  });
  if (!error) return;
  const m = error.message.toLowerCase();
  // The account already exists (e.g. a returning user used Create Account) —
  // that's fine, the OTP send that follows targets the existing account.
  if (m.includes("already registered") || m.includes("already exists")) return;
  throw new OtpError(
    "We couldn't create your account. New sign-ups may be disabled for this app — please contact the developer.",
    "SIGNUP_DISABLED",
  );
};

/**
 * Send a 6-digit Email OTP via Supabase Auth.
 *
 * Two modes:
 *   • Sign-up (default): `shouldCreateUser: true` — a brand-new account is
 *     created with the onboarding metadata (full name, role, phone). Supabase
 *     normally creates it lazily when the OTP is verified; if the project
 *     refuses that ("Signup not allowed for otp"), the auth user is created
 *     EXPLICITLY first and the code is then sent to the existing account — a
 *     brand-new user is never blocked with "No account found".
 *   • Sign-in: `shouldCreateUser: false` — only works for existing accounts;
 *     if the email has no account, a friendly "no account" error is returned
 *     instead of silently creating one.
 *
 * Dashboard requirement (done once, in the Supabase dashboard): the **Magic
 * Link** email template must include the `{{ .Token }}` variable so the email
 * contains a numeric one-time code instead of a clickable link, and "Allow
 * new users to sign up" must be enabled.
 */
export const sendOtp = async (params: {
  email: string;
  role: Role;
  profile?: OtpProfilePayload;
  shouldCreateUser?: boolean;
}): Promise<void> => {
  const client = requireBackend();
  const shouldCreateUser = params.shouldCreateUser ?? true;
  const email = params.email.trim().toLowerCase();
  const metadata = buildMetadata(params.role, params.profile);

  const sendCode = async (create: boolean) => {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: create, data: metadata },
    });
    return error;
  };

  try {
    const error = await sendCode(shouldCreateUser);
    if (!error) return;

    // Sign-in mode: Supabase refuses to send a code to an email that has no
    // account ("Signup not allowed for otp" / similar). Surface that as a
    // clear "create an account" hint instead of a cryptic backend message.
    if (!shouldCreateUser) {
      if (isSignupBlockedError(error.message)) {
        throw new OtpError(
          "No Sakhi AI account found for this email. Create an account to get started.",
          "NO_ACCOUNT",
        );
      }
      throw new OtpError(toFriendlyError(error.message), "OTP_ERROR");
    }

    // Sign-up mode: Supabase refused the lazy creation. Create the auth user
    // explicitly (with the onboarding metadata) and resend the code to the
    // now-existing account. The Create Account flow always succeeds for a
    // brand-new user instead of returning "No account found".
    if (isSignupBlockedError(error.message)) {
      await ensureAuthUserCreated(client, email, metadata);
      const retryError = await sendCode(false);
      if (retryError) {
        throw new OtpError(toFriendlyError(retryError.message), "OTP_ERROR");
      }
      return;
    }

    throw new OtpError(toFriendlyError(error.message), "OTP_ERROR");
  } catch (err) {
    if (err instanceof OtpError) throw err;
    throw new OtpError("Network error. Please check your connection and try again.", "NETWORK_ERROR");
  }
};

/**
 * Verify the emailed code with Supabase Auth and obtain the session. Returns
 * the authenticated user's id (used to check profile completion), or null.
 */
export const verifyOtpCode = async (params: {
  email: string;
  token: string;
}): Promise<string | null> => {
  const client = requireBackend();
  try {
    const { data, error } = await client.auth.verifyOtp({
      email: params.email.trim().toLowerCase(),
      token: params.token,
      type: "email",
    });
    if (error) throw new OtpError(toFriendlyError(error.message), "OTP_ERROR");
    return data.user?.id ?? null;
  } catch (err) {
    if (err instanceof OtpError) throw err;
    throw new OtpError("Network error. Please check your connection and try again.", "NETWORK_ERROR");
  }
};
