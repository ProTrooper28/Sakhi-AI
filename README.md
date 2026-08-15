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
| Auth / OTP   | Supabase Auth — built-in **Email OTP** (6-digit one-time code). **No magic links, no email confirmation links.** |
| Session      | Supabase Auth (persisted in localStorage)         |
| Twilio       | Reserved for future emergency **SOS SMS alerts** to guardians (not part of login) |

## Auth flows

- **Role selection** (`/`) — Continue as **User**, **Parent / Guardian**, or **Guest**.
- **Registration** (`/login` for users, `/register` for guardians) — a guided
  onboarding that keeps the original phone-first experience:
  1. **Full Name**
  2. **Mobile Number** (stored on the profile for future SMS OTP / SOS alerts —
     it is **not** used to send the login code)
  3. **Email Address** → clicking Continue sends the OTP
- **OTP verification** (`/otp`) — Supabase Auth emails a 6-digit **numeric code**
  (`signInWithOtp({ email })`), and the user verifies it with
  `verifyOtp({ email, token, type: "email" })`, which signs them in directly.
  No custom OTP logic, no magic-link exchange, no confirmation link.
- **Profile completion** (`/complete-profile`, **first login only**) — after OTP
  verification, new regular users add:
  - **Aadhaar Number** — only the **last 4 digits** are stored
  - **Optional Password** (for future account recovery)
  The email is already known (it's the OTP identifier) and shown prefilled.
- **Session** — Supabase Auth persists the session in localStorage; returning users
  are signed in automatically on app launch and go straight to their home/dashboard.
  They are **never asked for Aadhaar, email, or phone again** while the session is
  valid. OTP is only requested after logout, expiry, or a new device.
- **Guest mode** — skips Supabase and OTP entirely, loads demo data, shows a "Demo
  Mode" badge, and disables real emergency notifications. No database writes.

## Database schema

`profiles` (created by the migration, RLS-protected):

| column          | type        | notes                                        |
| --------------- | ----------- | -------------------------------------------- |
| id              | uuid (PK)   | references `auth.users(id)`                  |
| full_name       | text        | from signup metadata                         |
| phone           | text        | from signup metadata (E.164) — for future SMS OTP / SOS alerts |
| email           | text        | the OTP identifier — always recorded at signup |
| aadhaar_last4   | text        | **last 4 digits only** — never the full number |
| role            | text        | `'user'` \| `'parent'`                       |
| created_at / updated_at | timestamptz | auto-managed                          |

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
> (renames `aadhaar` → `aadhaar_last4`) and
> [`20260815030000_phone_from_user_metadata.sql`](supabase/migrations/20260815030000_phone_from_user_metadata.sql)
> (refreshes the signup trigger to store the onboarding phone number).

### 4. Enable Email OTP in Supabase Auth

Dashboard → **Auth → Providers → Email** → enable the **Email** provider. Then edit
the **Magic Link** email template (Dashboard → **Auth → Email Templates → Magic Link**)
so the email contains a 6-digit numeric code instead of a clickable link — add the
`{{ .Token }}` variable, for example:

```
<h2>Your Sakhi AI verification code</h2>
<p>Enter this code to continue: <strong>{{ .Token }}</strong></p>
```

That's all the configuration Supabase needs: `signInWithOtp({ email })` then sends a
one-time code, and the app verifies it with `verifyOtp({ type: "email" })` — no magic
links, no confirmation links. Codes are rate-limited (1 per 60s) and expire after
1 hour by default (configurable via Auth → Providers → Email → OTP expiration).

### 5. Run locally

```bash
bun install
bun run dev      # Vite dev server
bun run test     # Vitest
bun tsc -b --noEmit
```

## Security notes

- **Aadhaar**: the number is entered on the Profile Completion screen and only the
  **last four digits** are ever stored — in `profiles.aadhaar_last4`. The full number
  is never sent to the backend or kept anywhere in the app.
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
  pages/WelcomePage.tsx   # Role selection
  pages/LoginPage.tsx     # User onboarding (name → mobile → email → OTP)
  pages/ParentRegisterPage.tsx
  pages/OtpPage.tsx       # OTP entry, countdown, resend, verify + routing
  pages/CompleteProfilePage.tsx # First-login: Aadhaar last4 + optional password
supabase/
  migrations/…sql         # profiles + guardian_links + RLS
```
