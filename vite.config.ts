import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import type { IncomingMessage, ServerResponse } from "http";

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
        // Split ONLY the truly independent heavy libraries into their own
        // chunks. Everything else — react, react-dom, radix, router, and the
        // whole three/react-three stack — stays together in the "vendor"
        // chunk. Splitting react-adjacent libraries into separate chunks
        // creates circular cross-chunk imports that break module init order
        // at runtime ("Cannot read properties of undefined (reading
        // 'useLayoutEffect')"), so the graph must stay acyclic: leaf chunks
        // only import FROM the vendor chunk, never back.
        // This also keeps every asset under Workbox's 2 MiB precache limit
        // (vite-plugin-pwa fails the build otherwise) and speeds up first load.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("leaflet")) return "vendor-maps";
          if (id.includes("recharts") || id.includes("/d3-")) return "vendor-charts";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("framer-motion")) return "vendor-motion";
          return "vendor";
        },
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // API middleware — handles POST /api/chat → Groq in dev
    // Uses Node.js https module to avoid esbuild mangling the global fetch.
    {
      name: "sakhi-api-middleware",
      configureServer(server: any) {
        server.middlewares.use("/api/chat", async (req: IncomingMessage, res: ServerResponse) => {
          // Load GROQ_API_KEY from .env.local if not in process.env
          if (!process.env.GROQ_API_KEY) {
            try {
              const nodeFs = await import("node:fs");
              const nodePath = await import("node:path");
              const envFiles = [".env.local", ".env"];
              for (const file of envFiles) {
                const envPath = nodePath.default.resolve(process.cwd(), file);
                if (nodeFs.default.existsSync(envPath)) {
                  const content = nodeFs.default.readFileSync(envPath, "utf-8");
                  for (const line of content.split("\n")) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith("#")) continue;
                    const eqIdx = trimmed.indexOf("=");
                    if (eqIdx === -1) continue;
                    const key = trimmed.slice(0, eqIdx).trim();
                    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
                    if (key === "GROQ_API_KEY" && !process.env.GROQ_API_KEY) {
                      process.env.GROQ_API_KEY = val;
                    }
                  }
                }
              }
            } catch (e) {
              console.error("[/api/chat] Failed to load .env.local:", e);
            }
          }
          if (req.method !== "POST") {
            res.writeHead(405, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Method not allowed" }));
            return;
          }
          let body = "";
          for await (const chunk of req) body += chunk;
          try {
            const { messages } = JSON.parse(body);
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) {
              console.error("[/api/chat] GROQ_API_KEY is not set.");
              throw new Error("GROQ_API_KEY not configured. Add it in Settings \u2192 Environment.");
            }
            const systemPrompt = "You are Sakhi AI \u2014 the personal safety companion inside the Sakhi AI app. You are a caring, protective elder-sister figure who watches over the user's safety. Keep responses concise (2-4 sentences). If the user mentions feeling unsafe, immediately suggest SOS and guardian alert. Do NOT include action button labels in your response text.";
            const payload = JSON.stringify({
              model: "openai/gpt-oss-120b",
              messages: [{ role: "system", content: systemPrompt }, ...messages],
              temperature: 0.7,
              max_tokens: 1024,
            });
            const nodeHttps = await import("node:https");
            const groqBody = await new Promise<string>((resolve, reject) => {
              const groqReq = nodeHttps.default.request(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + apiKey,
                  },
                },
                (groqRes: any) => {
                  let data = "";
                  groqRes.on("data", (chunk: any) => (data += chunk));
                  groqRes.on("end", () => resolve(data));
                  groqRes.on("error", reject);
                },
              );
              groqReq.on("error", reject);
              groqReq.write(payload);
              groqReq.end();
            });
            const parsed = JSON.parse(groqBody);
            if (parsed.error) {
              console.error("[/api/chat] Groq error:", parsed.error.message || parsed.error);
              throw new Error(parsed.error.message || "Groq API error");
            }
            const content = parsed.choices?.[0]?.message?.content ?? "";
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ content }));
          } catch (err: any) {
            console.error("[/api/chat] Error:", err.message || err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message || "Internal error" }));
          }
        });
      },
    },
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
