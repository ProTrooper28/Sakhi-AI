import { supabase, isSupabaseConfigured } from "./supabase";
import type { GuardianLink } from "./auth-types";

/**
 * Guardian invite system — the bridge between the two apps.
 *
 *   USER side:      owns an 8-char invite code + QR; receives guardian link
 *                   requests (pending) and accepts/rejects them.
 *   GUARDIAN side:  enters the user's invite code + relationship to request a
 *                   link; the link only grants data access after the user
 *                   accepts (status → 'accepted').
 *
 * All writes respect the guardian_links RLS policies (a user can only ever
 * act on links where they are guardian_id or user_id).
 */

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_LENGTH = 8;

/** Generate a random 8-char invite code (unambiguous alphabet). */
export const generateInviteCode = (): string =>
  Array.from(
    { length: INVITE_LENGTH },
    () => INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)],
  ).join("");

/** Ensure the signed-in user has an invite code, generating + saving one if not. */
export const ensureInviteCode = async (): Promise<string | null> => {
  if (!supabase || !isSupabaseConfigured) return null;
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("invite_code")
    .eq("id", me.user.id)
    .maybeSingle();
  if (existing?.invite_code) return existing.invite_code;

  // No code yet — generate and save to our own row (rare unique conflict is
  // retried once).
  for (let attempt = 0; attempt < 2; attempt++) {
    const code = generateInviteCode();
    const { data: saved } = await supabase
      .from("profiles")
      .update({ invite_code: code })
      .eq("id", me.user.id)
      .select("invite_code")
      .maybeSingle();
    if (saved?.invite_code) return saved.invite_code;
  }
  return null;
};

/**
 * Fetch the signed-in user's guardian links.
 *
 *   as "parent" → links where they are the guardian (family members).
 *   as "user"   → links where they are the linked user (their guardians).
 */
export const fetchMyLinks = async (as: "user" | "parent"): Promise<GuardianLink[]> => {
  if (!supabase || !isSupabaseConfigured) return [];
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return [];
  const column = as === "parent" ? "guardian_id" : "user_id";
  const { data, error } = await supabase
    .from("guardian_links")
    .select("*")
    .eq(column, me.user.id)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as GuardianLink[];
};

export type AddLinkResult = { ok: boolean; message?: string };

/**
 * Guardian requests a link by entering the user's invite code.
 * Creates a pending guardian_links row — the user must accept before any data
 * is shared.
 */
export const addGuardianLink = async (params: {
  inviteCode: string;
  relationship: string;
  guardianName: string;
}): Promise<AddLinkResult> => {
  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, message: "Backend is not configured yet." };
  }
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return { ok: false, message: "Please sign in first." };

  const { data: found, error: rpcError } = await supabase.rpc("find_user_by_invite_code", {
    code: params.inviteCode.trim(),
  });
  if (rpcError || !found || found.length === 0) {
    return {
      ok: false,
      message: "No user found with that invite code. Double-check the code and try again.",
    };
  }
  const target = found[0] as { user_id: string; full_name: string };
  if (target.user_id === me.user.id) {
    return { ok: false, message: "That's your own invite code — share it with a guardian instead." };
  }

  const { error: insertError } = await supabase.from("guardian_links").insert({
    guardian_id: me.user.id,
    user_id: target.user_id,
    relationship: params.relationship,
    guardian_name: params.guardianName,
    user_name: target.full_name,
    status: "pending",
  });
  if (insertError) {
    const m = insertError.message.toLowerCase();
    if (m.includes("duplicate") || m.includes("unique")) {
      return { ok: false, message: "You've already requested to link with this user." };
    }
    return { ok: false, message: "Could not create the request. Please try again." };
  }
  return { ok: true };
};

/**
 * User accepts (status → 'accepted') or rejects (row deleted) a guardian
 * request. Returns true on success.
 */
export const respondToLink = async (linkId: string, decision: "accept" | "reject"): Promise<boolean> => {
  if (!supabase) return false;
  if (decision === "reject") {
    const { error } = await supabase.from("guardian_links").delete().eq("id", linkId);
    return !error;
  }
  const { error } = await supabase.from("guardian_links").update({ status: "accepted" }).eq("id", linkId);
  return !error;
};

/** Guardian removes a linked family member (or user removes their guardian). */
export const removeLink = async (linkId: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from("guardian_links").delete().eq("id", linkId);
  return !error;
};

/** Guardian renames the relationship on a link (e.g. "Sister" → "Mother"). */
export const renameRelationship = async (linkId: string, relationship: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from("guardian_links").update({ relationship }).eq("id", linkId);
  return !error;
};
