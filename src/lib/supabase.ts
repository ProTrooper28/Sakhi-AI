import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for Sakhi AI.
 *
 * The client is created only when the required environment variables are
 * present (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`). When they are
 * missing (e.g. a fresh clone before setup), `supabase` is `null` and the
 * app gracefully falls back to Guest/Demo mode instead of crashing.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const configured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = configured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        // Persist the session in localStorage so the user stays logged in
        // across app restarts (Supabase Auth default).
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** True when the Supabase backend has been wired up. */
export const isSupabaseConfigured = configured;
