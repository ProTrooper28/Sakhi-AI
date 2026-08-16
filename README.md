# Sakhi AI — Your Personal Safety Companion

Sakhi AI is a mobile-first personal safety companion web app (India-focused, Hinglish UI):
real-time SOS, an AI safety companion ("Sakhi Didi"), incident reporting, an evidence
locker, live guardian tracking, and location-based risk maps.

> ⚠️ **Frontend note:** this codebase is a **React + Vite + TypeScript** web app. The
> original product vision mentions Flutter; in this repository the frontend is React,
> and authentication is implemented in React with **Supabase Auth**.

---

## Stack

| Layer        | Technology                                        |
| ------------ | ------------------------------------------------- |
| Frontend     | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend      | Supabase (PostgreSQL, Auth)                       |
| Auth         | Supabase Auth — **email/mobile + password** for normal sign-in; **built-in email verification** (Confirm signup link) during account creation. No OTP anywhere. |
| Session      | Supabase Auth (persisted in localStorage)         |
| Twilio       | Reserved for future emergency **SOS SMS alerts** to guardians (not part of login) |

## Auth flows

- **Role selection** (`/`) — Continue as **User**, **Guardian**, or **Guest**.
- **Sign In** (`/signin`, both roles) — **Email OR Mobile Number + Password**.
  Supabase authenticates by email + password; a mobile number is resolved to
  the account email via the `lookup_email_by_phone` RPC. **No OTP for returning
  users.** On success the session is restored and the user lands directly on
  their dashboard (`/home` for users, `/guardian` for guardians).
- **Create Account** (`/login` for users, `/register` for guardians):
  1. **Full Name**, **Mobile Number** (stored on the profile for future SMS OTP /
     SOS alerts), **Email Address** → Continue
  2. **Verify your email** — `signUp` creates the Supabase Auth account with
     the onboarding metadata; the built-in email provider sends a **Confirm
     signup** email with a verification **link** (no OTP). Clicking it
     verifies the email and signs the user in automatically (implicit flow —
     the session is picked up by `detectSessionInUrl`). The profile row (full
     name, phone, email, role) is created at signup by the database trigger.
  3. **Create Password** — minimum 8 characters, show/hide, strength meter;
     saved to Supabase Auth (never to `profiles`). The account is now complete
     and the user opens their dashboard automatically.
- **Session** — Supabase Auth persists the session in localStorage; a signed-in
  user skips the Welcome screen entirely and opens their dashboard by role.
  Email verification is only needed once, during account creation — never
  for sign-in.
- **Forgot password** — sends a recovery email; the link opens `/reset-password`
  to choose a new password, then returns to the app.
- **Guest mode** — skips Supabase and authentication entirely, loads demo data,
  shows a "Demo Mode" badge, and disables real emergency notifications. No
  database writes.

## Development accounts (seed script)

To keep building while registration/OTP is paused, the app ships with three
predefined accounts created by a seed script (idempotent — safe to re-run):

| Name | Email | Password | Role (DB value) | Lands on |
| ---- | ----- | -------- | --------------- | -------- |
| Aanya | `aanya@sakhi.dev` | `User@123` | `user` | `/home` |
| Guardian | `guardian@sakhi.dev` | `Guardian@123` | `parent` ("Guardian" in the UI) | `/guardian` |
| Admin | `admin@sakhi.dev` | `Admin@123` | `admin` | `/home` (user app until an admin app exists) |

The seed script ALSO creates one **accepted** guardian link (Guardian ↔ Aanya,
relationship "Guardian") so the two-device flow works out of the box.

Setup once:

1. Add `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → service_role
   secret) to the app's Keys/API-keys tab. **Never prefix it with `VITE_`** —
   it must not reach the browser bundle.
2. Run the migrations in the Supabase SQL Editor (in order):
   - [`supabase/migrations/20260816010000_dev_admin_role.sql`](supabase/migrations/20260816010000_dev_admin_role.sql)
     (allows the `admin` role in `profiles.role`),
   - [`supabase/migrations/20260816020000_sos_realtime.sql`](supabase/migrations/20260816020000_sos_realtime.sql)
     (`safety_events` + `live_locations` tables, RLS, and the Realtime
     publication that powers live SOS / location updates), and
   - [`supabase/migrations/20260816030000_profiles_schema_drift_fix.sql`](supabase/migrations/20260816030000_profiles_schema_drift_fix.sql)
     (idempotent — renames `profiles.aadhaar` → `aadhaar_last4`, adds missing
     `phone` / `updated_at` / `invite_code` and the `guardian_links`
     relationship columns + invite-code RPC. No-op on a fully-migrated
     project.)
3. `bun run seed:dev` — creates/repairs the three accounts (email-confirmed,
   no OTP), verifies each profile row, seeds the accepted Guardian ↔ Aanya
   link, and runs the exact sign-in + profile load the app performs,
   printing PASS/FAIL per account.
4. Optional: `bun run scripts/verify-sos.ts` — end-to-end two-device test
   using only user tokens (RLS enforced): signs in Aanya + Guardian, checks
   the guardian sees Aanya and the accepted link, triggers a real SOS, reads
   it back as the guardian, upserts a live location, marks the SOS safe, and
   delivers a safe check-in — every step prints ✅/❌ against the live
   project.

Sign in with Email + Password only — no OTP, no verification emails.

## Real-time SOS & live location (Guardian ↔ User)

- **SOS** (`/sos` hold button or the floating button on `/home`) writes a
  `safety_events` row (status `active`) with the current coordinates.
- **Live location** is upserted continuously into `live_locations` (throttled
  to ~5 s while the app is open); battery level is included when the browser
  exposes it.
- **"I'm Safe"** resolves the SOS and sends a `checkin` event — the guardian
  sees a ✅ Safe Check-In with time + location.
- The **Guardian dashboard** (`/guardian`) subscribes to both tables via
  Supabase Realtime: a linked user's SOS flips the whole dashboard into the
  emergency view (alarm, live map, call/navigate/mark-safe actions), and
  location pings update the map and member readouts automatically — no
  refresh. RLS limits every read to the guardian's accepted linked users.
- Guests/demo mode never touch Supabase (local simulation only).

## Database schema

`profiles` (created by the migration, RLS-protected):

| column          | type        | notes                                        |
| --------------- | ----------- | -------------------------------------------- |
| id              | uuid (PK)   | references `auth.users(id)`                  |
| full_name       | text        | from signup metadata                         |
| phone           | text        | from signup metadata (E.164) — for future SMS OTP / SOS alerts |
| email           | text        | the sign-in identifier — always recorded at signup |
| role            | text        | `'user'` \| `'parent'`                       |
| created_at / updated_at | timestamptz | auto-managed                          |

> The legacy `aadhaar_last4` column may still exist on older projects but is
> no longer collected by the app. Passwords are NEVER stored in `profiles` —
> they live only in Supabase Auth.

`guardian_links` — `id`, `guardian_id`, `user_id`, `status` (`pending`/`accepted`),
`created_at`; RLS limits access to the two parties of a link.

## Setup

### 1. Create a Supabase project

1. Create a project at <https://supabase.com/dashboard>.
2. Open **Project Settings → API** and copy the **Project URL** and **anon public key**.

### 2. Add the client env vars

Set these in the app's Keys/API-keys UI (never commit them):

```
VITE_SUPABASE_URL=<your project URL>
VITE_SUPABASE_ANON_KEY=<your anon key>
```

Without them the app still runs — the login flows show a "backend not configured"
message and Guest mode works.

### 3. Create the database tables

Open **SQL Editor** in the Supabase dashboard and run
[`supabase/migrations/20260815000000_create_auth_tables.sql`](supabase/migrations/20260815000000_create_auth_tables.sql).
This creates `profiles` and `guardian_links`, the auto-profile trigger, and Row Level
Security policies (users can only see their own row; parents only see accepted linked
users).

> Already ran earlier migrations? Run these in order on your project:
> [`20260815020000_rename_aadhaar_to_last4.sql`](supabase/migrations/20260815020000_rename_aadhaar_to_last4.sql)
> (renames `aadhaar` → `aadhaar_last4`),
> [`20260815030000_phone_from_user_metadata.sql`](supabase/migrations/20260815030000_phone_from_user_metadata.sql)
> (refreshes the signup trigger to store the onboarding phone number),
> [`20260815040000_guardian_invites.sql`](supabase/migrations/20260815040000_guardian_invites.sql)
> (guardian invite codes + linking), and
> [`20260816000000_email_or_phone_login.sql`](supabase/migrations/20260816000000_email_or_phone_login.sql)
> (the `lookup_email_by_phone` RPC that powers mobile-number sign-in).

### 4. Enable Email Authentication (built-in verification)

Dashboard → **Auth → Providers → Email** → enable the **Email** provider and make
sure **Confirm email** is **ON** (the hosted default) — that is what sends the
"Confirm signup" verification email.

**Auth → URL Configuration** → set **Site URL** to this app's URL. The
verification link redirects back to the app (the app also passes it explicitly
as `emailRedirectTo` on every signup/resend call), so the URL must be allowed
under Site URL / Additional Redirect URLs.

Also confirm **Auth → Sign In / Up** → **Allow new users to sign up** is **ON**.

There is **no OTP** in this app and no email-template editing is needed: the
default **Confirm signup** template already contains the verification link that
the app's implicit flow picks up automatically.

### 5. Email delivery — use the built-in provider for development

**No SMTP setup is required.** For development, leave Supabase's **built-in email
provider** enabled (Dashboard → **Auth → SMTP** → Custom SMTP toggle **OFF**).
Emails are sent from `no-reply@supabase.co` at no extra cost — the app itself has no
SMTP dependency and works with either provider.

> If you ever see `Error sending confirmation email` / HTTP 500 during sign-up, that
> is GoTrue failing to send via **Custom SMTP** (wrong API key or unverified sender).
> Simplest fix: turn **Custom SMTP OFF** in Dashboard → **Auth → SMTP** and try again.
> The built-in provider sends instantly with zero credentials. (Note: the free
> built-in provider is rate-limited to a handful of emails per hour — enough for
> testing; space out repeated resends.)

### 5. Run locally

```bash
bun install
bun run dev      # Vite dev server
bun run test     # Vitest
bun tsc -b --noEmit
```

## Security notes

- **Passwords stay in Supabase Auth** — the `profiles` table never stores them.
- **Mobile sign-in** resolves a phone number to an email via a SECURITY DEFINER
  RPC that returns only the email for an exact normalized phone match (no
  enumeration).
- **No OTP secrets in the browser**: Supabase Auth handles OTP delivery server-side;
  the app only uses the anon key.
- **RLS** is enabled on both tables; `profiles` select is limited to your own row or
  accepted guardian links.
- **Twilio is not part of login.** It is reserved for future emergency SMS alerts to
  guardians when SOS is activated.

## Auth layer is future-ready

The OTP channel is isolated behind two functions in `src/lib/otp.ts`
(`sendOtp` / `verifyOtpCode`). Migrating from Email OTP to **Phone OTP** later only
means switching the payload key (`email` → `phone`), the verify `type`
(`"email"` → `"sms"`), and the dashboard SMS-provider configuration — every page in
the app stays the same. The phone number is already stored on the profile for exactly
that migration, and for SOS SMS alerts.

## Directory layout (auth)

```
src/
  lib/supabase.ts         # Supabase client (env-gated)
  lib/otp.ts              # Supabase Auth Email-OTP helpers (send / verify) + phone helpers
  lib/auth-types.ts       # Role / Profile / OTP flow types
  context/AuthContext.tsx # Session restore, guest mode, profile loading
  pages/WelcomePage.tsx   # Role selection (User / Guardian / Guest)
  pages/AuthChoicePage.tsx# Sign In vs Create Account
  pages/SignInPage.tsx    # Email-or-mobile + password login
  pages/LoginPage.tsx     # User registration (name → mobile → email → OTP)
  pages/ParentRegisterPage.tsx # Guardian registration (same flow)
  pages/OtpPage.tsx       # OTP entry, countdown, resend, verify + profile save
  pages/CreatePasswordPage.tsx  # Create Account step 3: set password → dashboard
supabase/
  migrations/…sql         # profiles + guardian_links + RLS
```
