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
                    if ((key === "GROQ_API_KEY" || key === "GEMINI_API_KEY" || key === "GOOGLE_API_KEY") && !process.env[key]) {
                      process.env[key] = val;
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
            const { messages, stream, context } = JSON.parse(body);
            // Gemini first (per spec), Groq as automatic drop-in fallback.
            // Keys stay server-side only — never exposed to the browser.
            const useGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
            const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;
            if (!apiKey) {
              console.error("[/api/chat] No AI key set (GEMINI_API_KEY / GOOGLE_API_KEY / GROQ_API_KEY).");
              throw new Error("AI API key not configured. Add GEMINI_API_KEY in Settings \u2192 Environment.");
            }
            // Live app context injected by the client (journey, SOS, triggers,
            // guardian link) so the assistant is situationally aware.
            const contextBlock = context && typeof context === "object"
              ? `\n\n## Live User Context (current app state — reference naturally, never enumerate)
- User's name: ${String(context.userName || "unknown")}
- SOS/emergency mode active right now: ${context.sosActive ? "YES" : "no"}
- Safety Journey status: ${context.journeyStatus || "none"}${context.journeyDestination ? ` (destination: ${context.journeyDestination})` : ""}
- Voice phrase trigger armed: ${context.voiceEnabled ? "yes" : "no"}
- Shake trigger armed: ${context.shakeEnabled ? "yes" : "no"}
- Guardian linked: ${context.guardianLinked ? "yes" : "no — demo mode"}
- Approximate area (if shared): ${context.locationLabel || "not shared"}
- Current local time: ${String(context.localTime || "")}

Use this context to personalize replies (e.g. mention the active journey or available triggers when relevant).`
              : "";
            const systemPrompt = `You are Sakhi AI — a warm, caring, protective elder-sister figure who is the user's personal safety companion inside the Sakhi AI app.

## Your Personality
- Speak with warmth, empathy, and genuine care — like a trusted elder sister
- Use natural, conversational language; mix in Hindi/Hinglish naturally when the user does
- Be encouraging and empowering, never condescending
- Use emojis sparingly but naturally (🙏 💛 🌸 ✨)
- Keep responses concise (2-4 sentences) unless the user asks for detailed information
- Always prioritize the user's safety and emotional well-being

## Safety Expertise
You are an expert on women's safety in India. You know about:
- Indian legal protections: Section 376 (rape), 354 (assault on woman), 498A (domestic violence), POCSO, Dowry Prohibition Act, Sexual Harassment at Workplace Act
- Women's rights under the Indian Constitution (Articles 14, 15, 16, 21)
- Emergency numbers: 112 (police), 1091 (women helpline), 108 (ambulance), 181 (women helpline)
- Safety tips: travel safety, workplace safety, digital safety, domestic safety
- How to file an FIR, what evidence to collect, legal recourse options
- Mental health resources and support organizations

## Health & Wellness Knowledge
You can answer general questions about:
- Women's health basics (menstrual health, pregnancy, nutrition, fitness)
- Mental health (anxiety, stress, depression awareness)
- Self-care and wellness tips
- General knowledge, current events, and everyday questions

## General Knowledge
You can answer any general question — dates, math, science, history, geography, culture, technology, etc. Be helpful and accurate.

## Important Rules
- If the user describes feeling unsafe or mentions harassment/assault, immediately suggest triggering SOS and alerting guardians. Show empathy and provide actionable guidance.
- Never diagnose medical conditions — always suggest consulting a doctor.
- For legal questions, provide general guidance but always recommend consulting a lawyer.
- Do NOT include action button labels in your response text.
- Detect the user's language and respond in the same language (Hindi, English, Hinglish, etc.)

## Primary Goals (in priority order)
1. Keep the user safe.
2. Give practical, actionable advice.
3. Remain calm — never create panic.
4. Encourage contacting guardians or emergency services when required.
5. Respect privacy.
6. Be empathetic.
7. Keep responses concise unless the user asks for details.

## Safety Boundaries
- NEVER encourage violence — self-defense advice is always about escape, distance, attracting attention, and getting to safety.
- NEVER provide harmful or illegal advice.
- Always recommend official emergency services (112, 1091) where appropriate.
- If the user is in immediate danger, keep the reply short and action-focused: call 112, share location, get to a crowded, well-lit place.${contextBlock}`;
            const payload = JSON.stringify(
              useGemini
                ? {
                    // Gemini generateContent format.
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: (Array.isArray(messages) ? messages : []).map((m: { role: string; content: string }) => ({
                      role: m.role === "assistant" ? "model" : "user",
                      parts: [{ text: m.content }],
                    })),
                    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
                  }
                : {
                    model: "openai/gpt-oss-120b",
                    messages: [{ role: "system", content: systemPrompt }, ...messages],
                    temperature: 0.7,
                    max_tokens: 1024,
                    stream: !!stream,
                  },
            );
            const nodeHttps = await import("node:https");
            if (stream) {
              // ── SSE streaming mode ──
              res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
              });
              const groqReq = nodeHttps.default.request(
                useGemini
                  ? "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse"
                  : "https://api.groq.com/openai/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    // Gemini authenticates via x-goog-api-key only — sending an
                    // Authorization Bearer header makes Google try OAuth2 and fail.
                    ...(useGemini
                      ? { "x-goog-api-key": apiKey }
                      : { Authorization: "Bearer " + apiKey }),
                  },
                },
                (groqRes: any) => {
                  if (groqRes.statusCode !== 200) {
                    let errData = "";
                    groqRes.on("data", (c: any) => (errData += c));
                    groqRes.on("end", async () => {
                      console.error("[/api/chat] AI stream error:", groqRes.statusCode, errData);
                      // Gemini 503s intermittently under load. Retry the
                      // non-streaming endpoint with backoff before giving up —
                      // the reply is then emitted as a single token so the
                      // chat still works end-to-end.
                      if (useGemini) {
                        const delays = [500, 1500, 3000];
                        for (const delay of delays) {
                          await new Promise((r) => setTimeout(r, delay));
                          try {
                          const retryBody = await new Promise<string>((resolve, reject) => {
                              const retryReq = nodeHttps.default.request(
                                "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    "x-goog-api-key": apiKey,
                                  },
                                },
                                (retryRes: any) => {
                                  let d = "";
                                  retryRes.on("data", (c: any) => (d += c));
                                  retryRes.on("end", () => resolve(d));
                                  retryRes.on("error", reject);
                                },
                              );
                              retryReq.on("error", reject);
                              retryReq.write(payload);
                              retryReq.end();
                            });
                            const retryParsed = JSON.parse(retryBody);
                            const text = (retryParsed.candidates?.[0]?.content?.parts ?? [])
                              .map((p: { text?: string }) => p.text || "")
                              .join("");
                            if (text) {
                              res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
                              res.write("data: [DONE]\n\n");
                              res.end();
                              return;
                            }
                          } catch (retryErr: any) {
                            console.error("[/api/chat] Gemini stream fallback failed:", retryErr?.message || retryErr);
                          }
                        }
                      }
                      res.write(`data: ${JSON.stringify({ error: "API error" })}\n\n`);
                      res.write("data: [DONE]\n\n");
                      res.end();
                    });
                    return;
                  }
                  groqRes.on("data", (chunk: any) => {
                    const lines = chunk.toString().split("\n").filter((l: string) => l.startsWith("data: "));
                    for (const line of lines) {
                      const data = line.slice(6).trim();
                      if (data === "[DONE]") {
                        res.write("data: [DONE]\n\n");
                      } else {
                        try {
                          const parsed = JSON.parse(data);
                          // Gemini SSE (candidates[0].content.parts[].text) and
                          // Groq/OpenAI (choices[0].delta.content) both handled.
                          const token =
                            parsed.choices?.[0]?.delta?.content ??
                            (parsed.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text || "").join("") ??
                            "";
                          if (token) {
                            res.write(`data: ${JSON.stringify({ token })}\n\n`);
                          }
                        } catch { /* skip malformed chunks */ }
                      }
                    }
                  });
                  groqRes.on("end", () => {
                    res.end();
                  });
                  groqRes.on("error", (err: any) => {
                    console.error("[/api/chat] Stream response error:", err.message);
                    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                    res.end();
                  });
                },
              );
              groqReq.on("error", (err: any) => {
                console.error("[/api/chat] Stream request error:", err.message);
                res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                res.end();
              });
              groqReq.write(payload);
              groqReq.end();
            } else {
              // ── Non-streaming mode (fallback) ──
              const groqBody = await new Promise<string>((resolve, reject) => {
                const groqReq = nodeHttps.default.request(
                  useGemini
                    ? "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
                    : "https://api.groq.com/openai/v1/chat/completions",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(useGemini
                        ? { "x-goog-api-key": apiKey }
                        : { Authorization: "Bearer " + apiKey }),
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
              const content = useGemini
                ? (parsed.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text || "").join("")
                : parsed.choices?.[0]?.message?.content ?? "";
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ content }));
            }
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
