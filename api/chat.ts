/**
 * Sakhi AI — /api/chat serverless function (Vercel).
 *
 * Vercel Serverless Functions require a DEFAULT export: (req, res) => void.
 * The old module only had a named export (`handleChatRequest`), which made
 * Vercel fail with "Invalid export found in module /var/task/api/chat.js".
 *
 * Mirrors the Vite dev middleware in vite.config.ts exactly:
 *   • Gemini first (gemini-3.8-flash via x-goog-api-key), Groq fallback
 *   • Same safety system prompt + live user-context block
 *   • Keys read from env: GEMINI_API_KEY / GOOGLE_API_KEY / GROQ_API_KEY
 *   • POST /api/chat → { content } | { error } JSON (streaming is dev-only;
 *     the frontend falls back to non-streaming automatically)
 */

const GEMINI_MODEL = "gemini-3.8-flash";
const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  GEMINI_MODEL +
  ":generateContent";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `You are Sakhi AI — a warm, caring, protective elder-sister figure who is the user's personal safety companion inside the Sakhi AI app.

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

## Women's Health & Wellness Knowledge
You are knowledgeable about women's health and answer in a supportive, clear, medically-accurate (general education) way:
- Menstrual health: cycle phases and typical length (21-35 days), what is normal vs. worth checking, period pain relief (heat, hydration, gentle movement, OTC pain relief per label), tracking patterns, PMS
- Common concerns: irregular or missed periods (stress, weight changes, thyroid, PCOS/PCOD), PCOS/PCOD basics (symptoms, lifestyle support, why a doctor must confirm), endometriosis awareness, heavy or very painful periods
- Infections & hygiene: UTI symptoms and prevention, yeast infection basics, menstrual hygiene
- Pregnancy basics: early signs, general do's and don'ts, urgent warning signs (severe pain, heavy bleeding, fainting)
- Nutrition: iron and anemia awareness (very common among Indian women), calcium, vitamin D, protein, hydration
- Mental health: anxiety, panic attacks (grounding: 5-4-3-2-1, slow breathing), stress, sleep, when to seek professional help; free counseling in India: Tele-MANAS 14416, iCall 9152987821
- Fitness and self-care basics

## Health Rules
- NEVER diagnose. Give general education and always recommend consulting a gynecologist/doctor for diagnosis, medication, or persistent symptoms.
- Red flags (heavy bleeding, fainting, severe abdominal pain, high fever, chest pain) → advise urgent care NOW (call 108 for an ambulance).
- You also answer general knowledge, current events, and everyday questions — be helpful and accurate.

## General Knowledge
You can answer any general question — dates, math, science, history, geography, culture, technology, etc. Be helpful and accurate.

## Important Rules
- If the user describes feeling unsafe or mentions harassment/assault, immediately suggest triggering SOS and alerting guardians. Show empathy and provide actionable guidance.
- DANGER AUTO-PROTOCOL: when the user describes an active threat (someone following them, stalking, an attacker, abduction attempt, or says help/save me/SOS), the app has ALREADY triggered the emergency SOS automatically — do NOT ask for confirmation, do NOT ask "would you like me to...", and do NOT ask follow-up questions before helping. Open with one short reassuring line acknowledging the SOS is active, then give immediate, concrete, 1-2-3 actions (get to a crowded well-lit place, call 112, share live location).
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
- If the user is in immediate danger, keep the reply short and action-focused: call 112, share location, get to a crowded, well-lit place.`;

function buildSystemPrompt(context: unknown): string {
  const ctx = (context && typeof context === "object" ? context : {}) as Record<string, unknown>;
  const contextBlock = `
## Live User Context (current app state — reference naturally, never enumerate)
- User's name: ${String(ctx.userName || "unknown")}
- SOS/emergency mode active right now: ${ctx.sosActive ? "YES" : "no"}
- Safety Journey status: ${String(ctx.journeyStatus || "none")}${ctx.journeyDestination ? ` (destination: ${String(ctx.journeyDestination)})` : ""}
- Journey overdue: ${ctx.journeyOverdueMin ? `${String(ctx.journeyOverdueMin)} min past the expected arrival` : "no"}
- AI Safe Check-in: ${String(ctx.safeCheckinStatus || "none")}${ctx.safeCheckinAcknowledged ? " (user already confirmed safe)" : ""}
- Device battery: ${ctx.batteryLevel != null ? `${String(ctx.batteryLevel)}%${ctx.batteryCharging ? " (charging)" : ""}` : "unknown"}${ctx.batteryStatus ? ` — ${String(ctx.batteryStatus)}` : ""}
- Safety Coach situation: ${String(ctx.coachHint || "nothing unusual")}
- Voice phrase trigger armed: ${ctx.voiceEnabled ? "yes" : "no"}
- Shake trigger armed: ${ctx.shakeEnabled ? "yes" : "no"}
- Guardian linked: ${ctx.guardianLinked ? "yes" : "no — demo mode"}
- Approximate area (if shared): ${String(ctx.locationLabel || "not shared")}
- Current local time: ${String(ctx.localTime || "")}

Use this context to personalize replies (e.g. mention the active journey or available triggers when relevant).

CHECK-IN ESCALATION GUIDANCE: If the AI Safe Check-in status says a check was sent with no response, or the journey is overdue, proactively offer: notify the guardian, trigger SOS, share live location, or call 112 — but the user always decides. Never claim an SOS was triggered automatically.

BATTERY GUIDANCE: If the device battery is below 10% during an active Safety Journey, acknowledge it proactively (e.g. "I noticed your battery is critically low during an active Safety Journey. I recommend notifying your guardian or ending your journey safely before the device powers off.") and offer: notify the guardian, share the live location, or find a nearby charging point.

SAFETY COACH MODE: You are a proactive personal safety coach, not just a Q&A bot. Use the "Safety Coach situation" line to weave context naturally into replies (e.g. mention the active journey's destination/ETA, low battery, late-night hours, or disabled emergency features). For travel messages ("travelling alone", "at night", "meeting someone", "taking a cab") give one concrete recommendation FIRST, then reassurance. Never be preachy — at most one recommendation per reply. If the user sounds scared, followed, or in danger, drop coaching entirely and switch to emergency assistance (SOS, guardian, live location, nearest police station).`;
  return SYSTEM_PROMPT + contextBlock;
}

async function callGemini(
  apiKey: string,
  messages: ChatMessage[],
  context: unknown,
): Promise<string> {
  const res = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(context) }] },
      contents: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { error?: { message?: string } })?.error?.message ||
      `Gemini API error (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: { text?: string }) => p.text || "").join("");
}

/**
 * Gemini 3.x intermittently returns 503 ("high demand") and thinking models
 * can emit empty text when the token budget is exhausted. Retry transient
 * failures with backoff; treat empty replies as retryable too.
 */
async function callGeminiWithRetry(
  apiKey: string,
  messages: ChatMessage[],
  context: unknown,
): Promise<string> {
  const delays = [0, 800, 2000];
  let lastErr: unknown = new Error("Gemini request failed");
  for (const delay of delays) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      const text = await callGemini(apiKey, messages, context);
      if (text.trim()) return text;
      lastErr = new Error("Gemini returned an empty response");
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : "";
      // Only retry transient upstream failures — surface real errors at once.
      if (!/503|429|500|overload|high demand|unavailable|empty/i.test(msg)) throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gemini request failed");
}

async function callGroq(apiKey: string, messages: ChatMessage[], context: unknown): Promise<string> {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt(context) },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { error?: { message?: string } })?.error?.message ||
      `Groq API error (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/**
 * Vercel Serverless Function handler (default export).
 */
export default async function handler(
  req: { method?: string; body?: unknown },
  res: {
    status: (code: number) => { json: (data: unknown) => void; end: () => void };
    setHeader: (name: string, value: string) => void;
  },
) {
  // CORS — the PWA may call the API from the deployed origin.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const context = body.context ?? null;

    if (messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    // Gemini first (per spec), Groq as automatic fallback.
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!geminiKey && !groqKey) {
      res.status(500).json({
        error:
          "AI API key not configured. Add GEMINI_API_KEY (or GROQ_API_KEY) in Settings → Environment.",
      });
      return;
    }

    let content: string;
    if (geminiKey) {
      try {
        content = await callGeminiWithRetry(geminiKey, messages, context);
      } catch (geminiErr) {
        console.error("[/api/chat] Gemini failed, falling back to Groq:", geminiErr);
        if (!groqKey) throw geminiErr;
        content = await callGroq(groqKey, messages, context);
      }
    } else {
      content = await callGroq(groqKey!, messages, context);
    }

    if (!content || !content.trim()) {
      res.status(502).json({ error: "The assistant returned an empty reply. Please try again." });
      return;
    }

    res.status(200).json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[/api/chat] Error:", message);
    res.status(500).json({ error: message });
  }
}
