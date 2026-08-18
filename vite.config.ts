import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor libraries into separate chunks so no single asset
        // exceeds Workbox's 2 MiB precache limit (vite-plugin-pwa build
        // fails otherwise) and the initial bundle loads faster.
        // All emitted chunks still match workbox.globPatterns below, so
        // the whole app keeps being precached for offline use.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@react-three") || id.includes("three-stdlib") || id.includes("/three")) return "vendor-three";
          if (id.includes("leaflet")) return "vendor-maps";
          if (id.includes("recharts") || id.includes("/d3-")) return "vendor-charts";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (
            id.includes("@radix-ui") ||
            id.includes("vaul") ||
            id.includes("cmdk") ||
            id.includes("sonner") ||
            id.includes("embla") ||
            id.includes("input-otp") ||
            id.includes("react-day-picker") ||
            id.includes("date-fns") ||
            id.includes("class-variance-authority") ||
            id.includes("tailwind-merge") ||
            id.includes("clsx")
          )
            return "vendor-ui";
          if (
            id.includes("react-router") ||
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("zod") ||
            id.includes("@tanstack") ||
            id.includes("react-resizable-panels")
          )
            return "vendor-react";
          if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
          return "vendor";
        },
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.png", "logo.svg", "logo-mark.svg", "logo-maskable.svg", "icon-192.svg", "icon-512.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png"],
      manifest: {
        name: "Sakhi AI — Safety Companion",
        short_name: "Sakhi AI",
        description:
          "Your personal safety companion powered by AI. Real-time SOS, guardian alerts, and evidence locker.",
        theme_color: "#ec4899",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["safety", "health", "utilities"],
        lang: "en",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
