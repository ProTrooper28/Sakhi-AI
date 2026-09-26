import { useMemo, useState } from "react";
import {
  Lock,
  Fingerprint,
  ScanSearch,
  CloudUpload,
  UserCheck,
  Check,
  Copy,
  ShieldCheck,
  FlaskConical,
  Info,
  ChevronUp,
  X,
} from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";

/**
 * EvidenceIntegrity — DEMO / HACKATHON PREVIEW ONLY.
 *
 * Purely presentational demonstration of Sakhi AI's planned evidence
 * integrity architecture (SHA-256 fingerprints, tamper detection).
 * It does NOT hash real files, touch uploads, storage, or any backend.
 * The displayed hash is a deterministic pseudo-fingerprint derived from
 * the item's seed so every file shows a unique, stable "hash".
 */

interface EvidenceIntegrityProps {
  /** Unique per evidence item (id + name). Drives the demo fingerprint. */
  seed: string;
  /** Display timestamp for the file. */
  timestamp: string;
  /** "light" for evidence cards, "dark" for the preview modal. */
  variant?: "light" | "dark";
  className?: string;
}

// Deterministic 32-bit seed (FNV-1a) — demo only, NOT a real SHA-256.
function seedFromString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// xorshift32 PRNG expanded into a 64-char hex "fingerprint" (SHA-256 length).
function pseudoHash(seed: number, length = 64): string {
  let s = seed || 0x9e3779b9;
  let out = "";
  while (out.length < length) {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    out += s.toString(16).padStart(8, "0");
  }
  return out.slice(0, length);
}

const FEATURES = [
  { icon: Lock, label: "Encrypted Storage", planned: false },
  { icon: Fingerprint, label: "SHA-256 Integrity Protection", planned: true },
  { icon: ScanSearch, label: "Tamper Detection Ready", planned: true },
  { icon: CloudUpload, label: "Secure Cloud Storage", planned: false },
  { icon: UserCheck, label: "Role-Based Guardian Access", planned: false },
];

const EvidenceIntegrity = ({ seed, timestamp, variant = "light", className = "" }: EvidenceIntegrityProps) => {
  const [copied, setCopied] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const fullHash = useMemo(() => pseudoHash(seedFromString(seed)), [seed]);
  const shortHash = `${fullHash.slice(0, 16)}…`;
  const fileId = `EVD-${fullHash.slice(0, 8).toUpperCase()}`;

  const isDark = variant === "dark";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullHash);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = fullHash;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* demo only */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const t = {
    section: isDark ? "border-slate-800" : "border-slate-100",
    title: isDark ? "text-slate-100" : "text-slate-900",
    badge: isDark
      ? "bg-amber-400/10 text-amber-300 border border-amber-400/20"
      : "bg-amber-50 text-amber-700 border border-amber-100",
    rowLabel: isDark ? "text-slate-500" : "text-slate-400",
    rowValue: isDark ? "text-slate-200" : "text-slate-700",
    card: isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-100",
    hashText: isDark ? "text-teal-300" : "text-slate-700",
    copyBtn: isDark ? "text-slate-400 hover:text-teal-300 hover:bg-slate-800" : "text-slate-400 hover:text-teal-600 hover:bg-white",
    howBtn: isDark
      ? "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
      : "bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 shadow-sm",
    planned: isDark ? "text-slate-500" : "text-slate-400",
    active: isDark ? "text-slate-200" : "text-slate-700",
  };

  return (
    <div className={`pt-4 border-t border-dashed ${t.section} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <Fingerprint className={`w-4 h-4 shrink-0 ${isDark ? "text-teal-400" : "text-teal-600"}`} />
          <span className={`text-[10px] font-black uppercase tracking-[0.15em] truncate ${t.title}`}>
            Security &amp; Integrity
          </span>
        </div>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 ${t.badge}`}>
          <FlaskConical className="w-3 h-3" /> Prototype Security Preview
        </span>
      </div>

      {/* Feature checklist */}
      <ul className="space-y-1.5 mb-3.5">
        {FEATURES.map(f => (
          <li key={f.label} className="flex items-center gap-2.5">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
              f.planned
                ? isDark ? "bg-slate-800" : "bg-slate-100"
                : isDark ? "bg-teal-400/15" : "bg-teal-50"
            }`}>
              <Check className={`w-2.5 h-2.5 ${f.planned ? t.planned : "text-teal-600"}`} />
            </span>
            <f.icon className={`w-3.5 h-3.5 shrink-0 ${f.planned ? t.planned : isDark ? "text-teal-400" : "text-teal-600"}`} />
            <span className={`text-[11px] font-bold ${f.planned ? t.planned : t.active}`}>
              {f.label}{f.planned && <span className="font-semibold opacity-70"> (Planned)</span>}
            </span>
          </li>
        ))}
      </ul>

      {/* Sample hash */}
      <div className={`rounded-2xl border p-3 mb-3 ${t.card}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${t.rowLabel}`}>
            SHA-256 · Sample Fingerprint
          </span>
          <button
            onClick={handleCopy}
            title="Copy fingerprint"
            className={`p-1 rounded-md transition-all cursor-pointer ${t.copyBtn}`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-teal-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className={`font-mono text-[11px] leading-relaxed break-all ${t.hashText}`}>
          {copied ? "Fingerprint copied to clipboard" : shortHash}
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-1.5 mb-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ${t.rowLabel}`}>Timestamp</span>
          <span className={`text-[11px] font-bold truncate ${t.rowValue}`}>{timestamp}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ${t.rowLabel}`}>File ID</span>
          <span className={`text-[11px] font-bold font-mono truncate ${t.rowValue}`}>{fileId}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 ${t.rowLabel}`}>Status</span>
          <span className="flex items-center gap-1.5 text-[11px] font-black text-green-600">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified
          </span>
        </div>
      </div>

      {/* How does this work */}
      <button
        onClick={() => setInfoOpen(true)}
        className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer ${t.howBtn}`}
      >
        <Info className="w-3.5 h-3.5" /> How does this work? <ChevronUp className="w-3.5 h-3.5" />
      </button>

      {/* Explanation bottom sheet */}
      <DrawerPrimitive.Root open={infoOpen} onOpenChange={setInfoOpen}>
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Overlay className="fixed inset-0 z-[10010] bg-slate-900/60 backdrop-blur-sm" />
          <DrawerPrimitive.Content className="fixed inset-x-0 bottom-0 z-[10011] mt-24 flex flex-col rounded-t-[28px] bg-white border border-slate-100 shadow-2xl outline-none max-h-[85vh]">
            <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-slate-200 shrink-0" />
            <div className="px-6 pt-5 pb-8 overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <DrawerPrimitive.Title className="text-lg font-black text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
                    How Evidence Integrity Works
                  </DrawerPrimitive.Title>
                </div>
                <button
                  onClick={() => setInfoOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <DrawerPrimitive.Description className="sr-only">
                Explanation of how SHA-256 evidence integrity and tamper detection will work in Sakhi AI.
              </DrawerPrimitive.Description>

              <div className="mt-5 space-y-3.5 text-[13px] font-medium text-slate-600 leading-relaxed">
                <p>Every uploaded evidence file will be assigned a unique SHA-256 cryptographic hash.</p>
                <p>The hash acts as a digital fingerprint.</p>
                <p>
                  If even a single byte of the evidence changes, the generated hash becomes completely different,
                  allowing the system to immediately detect tampering.
                </p>
                <p>
                  In the production version, this hash will be generated automatically during upload and securely
                  stored alongside the evidence metadata in PostgreSQL.
                </p>
                <p>
                  Whenever evidence is accessed or submitted, the file hash can be recalculated and compared with the
                  stored value to verify integrity.
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2.5 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
                <FlaskConical className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-[11px] font-bold text-amber-700 leading-snug">
                  Prototype preview — full SHA-256 cryptographic verification ships with the production backend.
                </p>
              </div>
            </div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    </div>
  );
};

export default EvidenceIntegrity;
