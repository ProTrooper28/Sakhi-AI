import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Profile, Role } from "@/lib/auth-types";

/**
 * Authentication context for Sakhi AI.
 *
 * Responsibilities:
 *  - Restore & persist the Supabase session (automatic login on restart).
 *  - Fetch the user's `profiles` row (name, role, masked Aadhaar).
 *  - Manage Guest/Demo mode (no Supabase, no OTP, demo data only).
 */

const GUEST_STORAGE_KEY = "sakhi_guest_mode";

type AuthContextType = {
  /** Supabase session, or null when signed out. */
  session: Session | null;
  /** Supabase user, or null when signed out / in guest mode. */
  user: User | null;
  /** Public profile row for the signed-in user. */
  profile: Profile | null;
  /** Role of the signed-in user ("user" | "parent"). */
  role: Role | null;
  /** True while the persisted session is being restored on startup. */
  ready: boolean;
  /** True when the user is exploring in Guest/Demo mode. */
  guest: boolean;
  /** Display name (authenticated name, or demo persona "Preeti" in guest mode). */
  displayName: string;
  /** Initials derived from the display name (avatar). */
  initials: string;
  /** Enter Guest/Demo mode (persisted across reloads). */
  enterGuest: () => void;
  /** Leave Guest/Demo mode. */
  exitGuest: () => void;
  /** Re-fetch the profile row for the current user (used after first-login profile completion). */
  refreshProfile: () => Promise<void>;
  /** Sign out of Supabase AND leave guest mode. */
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const readGuestFlag = (): boolean => {
  try {
    return localStorage.getItem(GUEST_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "S";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [guest, setGuest] = useState<boolean>(readGuestFlag);
  const [ready, setReady] = useState<boolean>(false);

  // ── Load profile whenever the authenticated user changes ────────────────
  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    // limit(1) keeps a stray duplicate row (from an earlier registration
    // attempt) from erroring the fetch; a missing row is not fatal either —
    // the app falls back to the auth user's metadata for name/role.
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .limit(1)
      .maybeSingle();
    if (error) {
      // RLS misconfiguration or schema drift — surface it, but don't brick
      // sign-in over a profile row: navigation uses the metadata fallback.
      console.error("[sakhi-auth] STEP 3 — profiles query failed:", error);
      return;
    }
    console.log(
      "[sakhi-auth] STEP 3 — profile loaded:",
      data ? { id: data.id, full_name: data.full_name, role: data.role } : null,
    );
    if (data) setProfile(data as Profile);
  }, []);

  // ── Restore persisted session + subscribe to auth changes ───────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // No backend wired up — treat as signed out and show the app shell.
      setReady(true);
      return;
    }

    let mounted = true;

    // A REAL Supabase session always wins over Guest/Demo mode. Guest mode is
    // a persisted flag (localStorage) that is only cleared by an explicit
    // sign-out — if a user visited demo mode earlier and then signs in for
    // real, a stale `sakhi_guest_mode` flag would make every post-login
    // navigation effect early-return (`if (!ready || guest || !user) return`)
    // and the login screen would appear "stuck": session created, no error,
    // no redirect. Exit guest mode whenever an authenticated session exists.
    const exitGuestOnRealSession = (s: Session | null) => {
      if (!s?.user) return;
      try {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
      setGuest(false);
    };

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      exitGuestOnRealSession(data.session);
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setReady(true);
    };

    void bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      exitGuestOnRealSession(nextSession);
      setSession(nextSession);
      if (nextSession?.user) {
        void loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // ── Re-fetch the profile (e.g. after first-login profile completion) ────
  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) await loadProfile(data.session.user.id);
  }, [loadProfile]);

  // ── Guest / Demo mode ────────────────────────────────────────────────────
  const enterGuest = useCallback(() => {
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, "1");
    } catch {
      // ignore storage errors
    }
    setGuest(true);
  }, []);

  const exitGuest = useCallback(() => {
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    setGuest(false);
  }, []);

  const signOut = useCallback(async () => {
    exitGuest();
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    // Fresh demo start: drop every leftover local marker (an abandoned Create
    // Account attempt, a persisted demo SOS) so the next visitor begins from
    // the Welcome/Login screen with no stale state.
    try {
      localStorage.removeItem("sakhi_pending_signup");
      localStorage.removeItem("sakhi_sos_state");
    } catch {
      // ignore storage errors
    }
  }, [exitGuest]);

  // ── Derived values ───────────────────────────────────────────────────────
  const user = session?.user ?? null;
  // Role comes from the profiles row when available; otherwise fall back to
  // the auth user's signup metadata (always saved during Create Account).
  // Without this, a missing/unreadable profile row leaves `role` null forever
  // and the Sign In screen never navigates past login. Last resort is the
  // default "user" role so a signed-in user is never stranded on the login
  // screen — a broken profile fetch must not brick sign-in.
  const role = (profile?.role ??
    (user?.user_metadata?.role as Role | undefined) ??
    "user") as Role;
  // Authenticated users get their profile name; guest/demo uses the
  // sample persona "Preeti" to stay consistent with the demo data.
  const displayName =
    profile?.full_name || (user?.user_metadata?.full_name as string | undefined) || "Preeti";
  const initials = initialsOf(displayName);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        ready,
        guest,
        displayName,
        initials,
        refreshProfile,
        enterGuest,
        exitGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
