/**
 * Shared authentication types for Sakhi AI.
 */

/**
 * Account role — determines which experience the user lands in.
 *
 *   "user"    → the User app (/home)
 *   "parent"  → the Guardian / Parent monitoring app (/guardian)
 *   "admin"   → no dedicated admin app yet; uses the User app (/home)
 *
 * NOTE: the Welcome screen calls the parent role "Guardian"; inside the app
 * the role value is `"parent"` (the DB CHECK constraint and all guards use
 * it). Dev accounts created by scripts/seed-dev-accounts.ts use the same
 * values, so "Guardian" in the UI maps to role `parent`.
 */
export type Role = "user" | "parent" | "admin";

/**
 * The home route for a signed-in user, by role.
 *   user  → /home        (User dashboard)
 *   parent → /guardian   (Guardian monitoring dashboard)
 *   admin  → /home       (User dashboard — no admin app implemented yet)
 *
 * Every post-login redirect uses this single helper so the three roles can
 * never be routed inconsistently.
 */
export const roleHomePath = (role: Role): string =>
  role === "parent" ? "/guardian" : "/home";

/**
 * Whether a signed-in role may open a role-gated route.
 *   parent app routes accept only `parent`;
 *   user app routes accept `user` and `admin` (admin uses the user app).
 */
export const canAccess = (role: Role, expected: "user" | "parent"): boolean =>
  role === expected || (expected === "user" && role === "admin");

/**
 * Public profile record stored in Supabase (`public.profiles`).
 * NOTE: `aadhaar_last4` only ever holds the LAST FOUR DIGITS of the Aadhaar
 * number. The full number is never sent to the backend or stored.
 */
export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  aadhaar_last4: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
};

/**
 * Registration data collected before the OTP step (Email OTP flow).
 *
 *   full_name — shown on the home greeting.
 *   phone     — stored on the auth user (raw_user_meta_data) and copied into
 *               `profiles.phone` by a database trigger, so it is available
 *               later for a seamless migration to phone/SMS OTP and for
 *               future SOS SMS alerts. The phone number is NEVER used to send
 *               the login OTP in this flow.
 *
 * The OTP itself is delivered by Supabase Auth to the user's EMAIL (a 6-digit
 * one-time code — not a magic link, not a confirmation link).
 */
export type OtpProfilePayload = {
  full_name: string;
  phone: string;
};

/** Which half of the auth flow the OTP screen belongs to. */
export type OtpMode = "signup" | "signin";

/**
 * State passed from a registration / sign-in page to the OTP screen.
 *
 *   mode    — "signup" (new account, profile metadata present) or
 *             "signin" (existing account, email only — no name/phone).
 *   profile — the onboarding metadata (full name, phone) collected during
 *             sign-up; absent for sign-in.
 */
export type OtpFlowState = {
  email: string;
  role: Role;
  profile?: OtpProfilePayload;
  mode?: OtpMode;
};

/**
 * A guardian ↔ user link request (public.guardian_links).
 *
 * `guardian_name` / `user_name` are denormalized at insert time because RLS
 * prevents either side from reading the other profile row before a link is
 * accepted — both sides can still render the other person's name.
 */
export type GuardianLink = {
  id: string;
  guardian_id: string;
  user_id: string;
  relationship: string | null;
  guardian_name: string | null;
  user_name: string | null;
  status: "pending" | "accepted";
  created_at: string;
};

/** Relationship options shown when a guardian links a new family member. */
export const RELATIONSHIPS = [
  "Mother",
  "Father",
  "Brother",
  "Sister",
  "Friend",
  "Spouse",
  "Guardian",
  "Other",
] as const;

export type Relationship = (typeof RELATIONSHIPS)[number];
