import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Real-time safety pipeline (two-device Guardian ↔ User).
 *
 * The USER side:
 *   - createSosEvent      — SOS pressed → row in safety_events (status active)
 *   - sendSafeCheckIn     — "I'm Safe" → row in safety_events (type checkin)
 *   - resolve/cancelSos   — closes the active SOS
 *   - upsertLiveLocation  — continuous location + battery → live_locations
 *
 * The GUARDIAN side (RLS limits everything to accepted linked users):
 *   - fetchSafetyEvents / subscribeSafetyEvents   — SOS + check-ins
 *   - fetchLiveLocations / subscribeLiveLocations — live position updates
 *
 * Guests never call these (the caller guards with `guest`), and every
 * function no-ops when Supabase isn't configured, so demo mode keeps working.
 */

export type SafetyEventType = "sos" | "checkin";
export type SafetyEventStatus = "active" | "resolved" | "cancelled";

export type SafetyEvent = {
  id: string;
  user_id: string;
  type: SafetyEventType;
  status: SafetyEventStatus;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  triggered_at: string;
  resolved_at: string | null;
  created_at: string;
};

export type LiveLocation = {
  user_id: string;
  latitude: number;
  longitude: number;
  location_label: string | null;
  battery_level: number | null;
  updated_at: string;
};

const configured = isSupabaseConfigured && supabase;

/** Current user id, or null when signed out / backend missing. */
const currentUserId = async (): Promise<string | null> => {
  if (!configured) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

const logError = (tag: string, error: unknown): void => {
  console.error(`[sakhi-safety] ${tag}`, error);
};

/** ── User side: create an SOS event ───────────────────────────────────────── */
export const createSosEvent = async (p: {
  lat: number;
  lng: number;
  label: string | null;
}): Promise<SafetyEvent | null> => {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("safety_events")
    .insert({
      user_id: userId,
      type: "sos",
      status: "active",
      latitude: p.lat,
      longitude: p.lng,
      location_label: p.label,
    })
    .select()
    .single();
  if (error) {
    logError("createSosEvent failed", error);
    return null;
  }
  return data as SafetyEvent;
};

/** ── User side: "I'm Safe" check-in (guardian gets a ✅ notification) ─────── */
export const sendSafeCheckIn = async (p: {
  lat: number;
  lng: number;
  label: string | null;
}): Promise<SafetyEvent | null> => {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("safety_events")
    .insert({
      user_id: userId,
      type: "checkin",
      status: "active",
      latitude: p.lat,
      longitude: p.lng,
      location_label: p.label,
    })
    .select()
    .single();
  if (error) {
    logError("sendSafeCheckIn failed", error);
    return null;
  }
  return data as SafetyEvent;
};

/** ── Resolve an SOS event (own, or a linked user's — guardian Mark Safe) ─── */
export const resolveSosEvent = async (eventId: string): Promise<boolean> => {
  if (!configured) return false;
  const { error } = await supabase
    .from("safety_events")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", eventId);
  if (error) {
    logError("resolveSosEvent failed", error);
    return false;
  }
  return true;
};

/** ── Cancel an SOS event (user backs out before help arrives) ────────────── */
export const cancelSosEvent = async (eventId: string): Promise<boolean> => {
  if (!configured) return false;
  const { error } = await supabase
    .from("safety_events")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("id", eventId);
  if (error) {
    logError("cancelSosEvent failed", error);
    return false;
  }
  return true;
};

/** ── Continuous live location upsert (one row per user, latest wins) ─────── */
export const upsertLiveLocation = async (p: {
  lat: number;
  lng: number;
  label?: string | null;
  battery?: number | null;
}): Promise<boolean> => {
  const userId = await currentUserId();
  if (!userId) return false;
  const { error } = await supabase
    .from("live_locations")
    .upsert(
      {
        user_id: userId,
        latitude: p.lat,
        longitude: p.lng,
        location_label: p.label ?? null,
        battery_level: p.battery ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) {
    // Swallow transient failures (offline etc.) — the next position update
    // retries automatically.
    if (error.code !== "PGRST205") logError("upsertLiveLocation failed", error);
    return false;
  }
  return true;
};

/** ── Guardian side: initial snapshots (RLS scopes to own + linked users) ─── */
export const fetchSafetyEvents = async (): Promise<SafetyEvent[]> => {
  if (!configured) return [];
  const { data, error } = await supabase
    .from("safety_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    logError("fetchSafetyEvents failed", error);
    return [];
  }
  return (data ?? []) as SafetyEvent[];
};

export const fetchLiveLocations = async (): Promise<LiveLocation[]> => {
  if (!configured) return [];
  const { data, error } = await supabase.from("live_locations").select("*");
  if (error) {
    logError("fetchLiveLocations failed", error);
    return [];
  }
  return (data ?? []) as LiveLocation[];
};

/** ── Guardian side: live subscriptions (no manual refresh) ───────────────── */
export const subscribeSafetyEvents = (cb: (event: SafetyEvent) => void): (() => void) => {
  if (!configured) return () => {};
  const channel = supabase
    .channel("sakhi-safety-events")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "safety_events" },
      (payload) => cb(payload.new as SafetyEvent),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
};

export const subscribeLiveLocations = (cb: (location: LiveLocation) => void): (() => void) => {
  if (!configured) return () => {};
  const channel = supabase
    .channel("sakhi-live-locations")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_locations" },
      (payload) => cb(payload.new as LiveLocation),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
};
