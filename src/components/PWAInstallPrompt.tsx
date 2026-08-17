import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SakhiMark } from "@/components/SakhiLogo";
import { Download, X } from "lucide-react";

/**
 * PWA Install Prompt — shows a branded "Install Sakhi AI" banner
 * when the browser supports installation and the user hasn't dismissed it.
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem("pwa-install-dismissed") === "true") {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also detect if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShow(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt as any;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    console.log("[PWA] Install prompt outcome:", outcome);
    setDeferredPrompt(null);
    setShow(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "true");
  }, []);

  // Don't show on iOS (no beforeinstallprompt, manual install only)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (dismissed || (!show && !isIOS)) return null;

  return (
    <AnimatePresence>
      {(show || isIOS) && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-pink-500/20 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl">
            {/* App icon */}
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 shadow-lg">
              <SakhiMark className="h-8 w-8" />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Install Sakhi AI</p>
              <p className="text-xs text-slate-400">
                {isIOS
                  ? "Tap Share → Add to Home Screen"
                  : "Add to your home screen for quick access"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isIOS && (
                <button
                  onClick={handleInstall}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-pink-500 px-3.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-pink-600 active:bg-pink-700"
                >
                  <Download size={14} />
                  Install
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
