import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  Loader2,
  UserPlus,
  Trash2,
  ArrowRight,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  ensureInviteCode,
  fetchMyLinks,
  respondToLink,
  removeLink,
  generateInviteCode,
} from "@/lib/guardians";
import type { GuardianLink } from "@/lib/auth-types";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
});

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "G";

const AVATAR_COLORS = ["#F2956A", "#3D9970", "#D4455C", "#6B4F40", "#B7770D", "#2E7D56"];

const timeAgo = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

/**
 * Guardian Management — the USER side of the guardian invite system.
 *
 *   • The user owns an 8-char invite code + QR to share with a parent/guardian.
 *   • Incoming guardian requests appear here; the user must ACCEPT before the
 *     guardian can see anything (RLS only grants linked access on 'accepted').
 *   • Linked guardians can be removed at any time.
 */
const GuardiansPage = () => {
  const navigate = useNavigate();
  const { user, guest } = useAuth();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [code, fetched] = await Promise.all([ensureInviteCode(), fetchMyLinks("user")]);
    setInviteCode(code);
    setLinks(fetched);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && !guest && isSupabaseConfigured && supabase) void load();
    else {
      setLoading(false);
      setLinks([]);
      setInviteCode(null);
    }
  }, [user, guest, load]);

  const regenerate = async () => {
    if (!user) return;
    setError(null);
    const fresh = generateInviteCode();
    const { error: updError } = await supabase
      ?.from("profiles")
      .update({ invite_code: fresh })
      .eq("id", user.id);
    if (updError) {
      setError("Could not generate a new code. Please try again.");
      return;
    }
    setInviteCode(fresh);
  };

  const handleRespond = async (link: GuardianLink, decision: "accept" | "reject") => {
    setBusyId(link.id);
    setError(null);
    const ok = await respondToLink(link.id, decision);
    setBusyId(null);
    if (ok) {
      setLinks((prev) =>
        decision === "accept"
          ? prev.map((l) => (l.id === link.id ? { ...l, status: "accepted" as const } : l))
          : prev.filter((l) => l.id !== link.id),
      );
    } else {
      setError("That didn't work. Please try again.");
    }
  };

  const handleRemove = async (link: GuardianLink) => {
    setBusyId(link.id);
    const ok = await removeLink(link.id);
    setBusyId(null);
    if (ok) setLinks((prev) => prev.filter((l) => l.id !== link.id));
    else setError("Could not remove the guardian. Please try again.");
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy — please copy the code manually.");
    }
  };

  const pending = links.filter((l) => l.status === "pending");
  const accepted = links.filter((l) => l.status === "accepted");
  const qrUrl = inviteCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(`SAKHI-${inviteCode}`)}`
    : null;

  return (
    <AppLayout>
      <div style={{ minHeight: "100vh", background: "var(--sakhi-cream)", paddingBottom: "8rem" }}>
        <div className="max-w-2xl mx-auto px-4 pt-4">
          {/* ── Header ── */}
          <motion.div {...fadeUp(0)} className="mb-5">
            <p
              style={{
                fontFamily: "var(--font-deva)",
                fontWeight: 600,
                fontSize: 13,
                color: "#9E7A6A",
                marginBottom: 2,
              }}
            >
              Guardian Management
            </p>
            <h1
              style={{
                fontFamily: "Nunito,sans-serif",
                fontWeight: 900,
                fontSize: 26,
                color: "#3D2315",
                lineHeight: 1.15,
              }}
            >
              Your trusted circle 💛
            </h1>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 12.5, color: "#9E7A6A", marginTop: 6, lineHeight: 1.55 }}>
              Share your invite code with a parent or guardian. They can only see your location
              and SOS alerts after you accept their request.
            </p>
          </motion.div>

          {error && (
            <motion.div
              {...fadeUp(0.05)}
              style={{
                background: "rgba(212,69,92,0.08)",
                border: "1px solid rgba(212,69,92,0.25)",
                borderRadius: 12,
                padding: "0.625rem 0.875rem",
                fontFamily: "Nunito,sans-serif",
                fontWeight: 700,
                fontSize: 12,
                color: "#B8324A",
                marginBottom: "1rem",
              }}
            >
              {error}
            </motion.div>
          )}

          {!user || guest ? (
            <motion.div
              {...fadeUp(0.1)}
              className="rounded-[24px] p-8 text-center"
              style={{ background: "white", boxShadow: "0 4px 24px rgba(139,58,47,0.06)" }}
            >
              <Shield className="w-12 h-12 text-[#D4455C] mx-auto mb-3" />
              <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 18, color: "#3D2315" }}>
                Sign in to manage your guardians
              </h2>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12.5, color: "#9E7A6A", marginTop: 4, lineHeight: 1.6 }}>
                Guest mode uses demo data only — guardian links are stored on your
                real Sakhi account.
              </p>
              <button
                onClick={() => navigate("/signin")}
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)", border: "none", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13 }}
              >
                Sign In <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
            </motion.div>
          ) : loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
              <span className="dot-teal" />
            </div>
          ) : (
            <>
              {/* ── Invite card ── */}
              <motion.div
                {...fadeUp(0.08)}
                className="rounded-[24px] p-5 mb-5 overflow-hidden relative"
                style={{
                  background: "linear-gradient(135deg,#5C2018 0%,#8B3A2F 100%)",
                  boxShadow: "0 8px 28px rgba(92,32,24,0.25)",
                }}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="flex-shrink-0 w-24 h-24 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                    {qrUrl ? (
                      <img src={qrUrl} alt="Invite QR code" width={88} height={88} style={{ borderRadius: 8 }} />
                    ) : (
                      <QrCode className="w-10 h-10 text-[#8B3A2F]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1 }}>
                      Your Invite Code
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        style={{
                          fontFamily: "Nunito,sans-serif",
                          fontWeight: 900,
                          fontSize: 26,
                          color: "white",
                          letterSpacing: "0.14em",
                        }}
                      >
                        {inviteCode ?? "········"}
                      </span>
                      <button
                        onClick={() => void copyCode()}
                        aria-label="Copy invite code"
                        className="cursor-pointer"
                        style={{
                          background: "rgba(255,255,255,0.14)",
                          border: "none",
                          borderRadius: 10,
                          padding: "0.45rem 0.6rem",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {copied ? <Check style={{ width: 15, height: 15, color: "#6EE7B7" }} /> : <Copy style={{ width: 15, height: 15 }} />}
                      </button>
                      <button
                        onClick={() => void regenerate()}
                        aria-label="Generate a new invite code"
                        title="Generate a new code (invalidates the old one)"
                        className="cursor-pointer"
                        style={{
                          background: "rgba(255,255,255,0.14)",
                          border: "none",
                          borderRadius: 10,
                          padding: "0.45rem 0.6rem",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <RefreshCw style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11.5, color: "rgba(255,255,255,0.65)", marginTop: 6, lineHeight: 1.5 }}>
                      Share this code (or QR) with your parent / guardian — they enter it in
                      their Sakhi Guardian app to request a link.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* ── Incoming requests ── */}
              <motion.div {...fadeUp(0.14)} className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 16, color: "#3D2315" }}>
                    Guardian Requests
                  </h2>
                  {pending.length > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(212,69,92,0.1)", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10.5, color: "#D4455C" }}
                    >
                      {pending.length} waiting
                    </span>
                  )}
                </div>

                {pending.length === 0 ? (
                  <div className="rounded-[20px] p-4 text-center" style={{ background: "white", boxShadow: "0 2px 12px rgba(139,58,47,0.05)" }}>
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12.5, color: "#9E7A6A" }}>
                      No pending requests. Share your code above to invite a guardian. 🎈
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pending.map((link, i) => {
                      const name = link.guardian_name ?? "A guardian";
                      return (
                        <motion.div
                          key={link.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-[20px] p-4 flex items-center gap-3"
                          style={{ background: "white", boxShadow: "0 2px 12px rgba(139,58,47,0.06)" }}
                        >
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                            style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                          >
                            {initialsOf(name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14, color: "#3D2315" }}>
                              {name}
                            </p>
                            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A" }}>
                              {link.relationship ? `${link.relationship} · ` : ""}requested {timeAgo(link.created_at)}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => void handleRespond(link, "reject")}
                              disabled={busyId === link.id}
                              className="px-3.5 py-2 rounded-full cursor-pointer disabled:opacity-50"
                              style={{ background: "rgba(158,122,106,0.1)", border: "none", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: "#6B4F40" }}
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => void handleRespond(link, "accept")}
                              disabled={busyId === link.id}
                              className="px-3.5 py-2 rounded-full text-white cursor-pointer disabled:opacity-50"
                              style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)", border: "none", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12 }}
                            >
                              {busyId === link.id ? "…" : "Accept"}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* ── Linked guardians ── */}
              <motion.div {...fadeUp(0.18)}>
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 16, color: "#3D2315" }}>
                    Linked Guardians
                  </h2>
                  <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#9E7A6A" }}>
                    {accepted.length} {accepted.length === 1 ? "guardian" : "guardians"}
                  </span>
                </div>

                {accepted.length === 0 ? (
                  <div className="rounded-[20px] p-5 text-center" style={{ background: "white", boxShadow: "0 2px 12px rgba(139,58,47,0.05)" }}>
                    <Users className="w-10 h-10 text-[#F2956A] mx-auto mb-2.5" />
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13.5, color: "#3D2315" }}>
                      No guardians linked yet
                    </p>
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12, color: "#9E7A6A", marginTop: 3 }}>
                      Once a guardian accepts your invite, they'll appear here and can
                      watch over your safety.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {accepted.map((link, i) => {
                      const name = link.guardian_name ?? "Guardian";
                      return (
                        <motion.div
                          key={link.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-[20px] p-4 flex items-center gap-3"
                          style={{ background: "white", boxShadow: "0 2px 12px rgba(139,58,47,0.06)" }}
                        >
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                            style={{ background: AVATAR_COLORS[(i + 2) % AVATAR_COLORS.length] }}
                          >
                            {initialsOf(name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14, color: "#3D2315" }}>{name}</p>
                            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#3D9970" }}>
                              {link.relationship ? `${link.relationship} · ` : ""}linked {timeAgo(link.created_at)}
                            </p>
                          </div>
                          <button
                            onClick={() => void handleRemove(link)}
                            disabled={busyId === link.id}
                            aria-label={`Remove ${name}`}
                            className="cursor-pointer p-2.5 rounded-full disabled:opacity-50"
                            style={{ background: "rgba(212,69,92,0.08)", border: "none", color: "#D4455C" }}
                          >
                            {busyId === link.id ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : <Trash2 style={{ width: 15, height: 15 }} />}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default GuardiansPage;
