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
  /**
   * True when the signed-in user has not completed their first-login profile
   * (Aadhaar last-4 missing for "user" role). Email is always recorded at
   * signup (it's the OTP identifier), so a missing Aadhaar last-4 is the
   * first-login signal. Such users are routed to the Profile Completion
   * screen; parents never need it.
   */
  needsProfileCompletion: boolean;
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
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) setProfile(data as Profile);
  }, []);

  // ── Restore persisted session + subscribe to auth changes ───────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // No backend wired up — treat as signed out and show the app shell.
      setReady(true);
      return;
    }

    let mounted = true;

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setReady(true);
    };

    void bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
  }, [exitGuest]);

  // ── Derived values ───────────────────────────────────────────────────────
  const user = session?.user ?? null;
  const role = (profile?.role as Role) ?? null;
  // Authenticated users get their profile name; guest/demo uses the
  // sample persona "Preeti" to stay consistent with the demo data.
  const displayName =
    profile?.full_name || (user?.user_metadata?.full_name as string | undefined) || "Preeti";
  const initials = initialsOf(displayName);

  // A profile only counts as "incomplete" for regular users missing the
  // Aadhaar last-4 (parents don't provide Aadhaar; email is always present
  // because it's the OTP identifier). Derived from the loaded profile, so it
  // never triggers while the profile is still being fetched on startup.
  const needsProfileCompletion =
    user !== null && profile !== null && profile.role === "user" && !profile.aadhaar_last4;

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
        needsProfileCompletion,
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
