/**
 * Sakhi AI — Groq chat completions backend handler.
 *
 * Used by:
 *   • Vite dev-server middleware (vite.config.ts → configureServer)
 *   • Any standalone Node.js / serverless host that can import this module
 *
 * Requires the GROQ_API_KEY environment variable to be set.
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are Sakhi Didi — the AI safety companion inside the Sakhi AI app. You are a caring, protective elder-sister figure who watches over the user's safety.

Personality:
- Warm, empathetic, and supportive — speak like a caring elder sister
- Always prioritizes the user's safety above all else
- Proactive about suggesting safety measures
- Never dismissive of safety concerns
- Uses simple, clear language; occasional Hindi words are fine

Capabilities you can suggest (the system shows these as tappable action buttons):
- "Start Safety Journey" — monitor a trip with deviation detection
- "Share Live Location" — share GPS with a guardian
- "Call Guardian" — call emergency contact
- "Trigger SOS" — activate emergency mode
- "Find Safe Place Nearby" — locate safe locations
- "File Anonymous Report" — report an incident
- "Review Evidence" — check stored evidence
- "Emergency Helplines" — helpline numbers

Response guidelines:
- Keep responses concise (2-4 sentences max)
- If the user mentions feeling unsafe, someone following them, or any threat → immediately suggest SOS and guardian alert
- If the user mentions an emergency → prioritize SOS activation
- For general safety questions → provide helpful, actionable advice
- Never provide medical, legal, or professional advice — suggest appropriate helplines
- Always end with a safety-relevant action suggestion when appropriate
- Do NOT include action button labels in your response text — the app handles those separately`;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Send conversation messages to Groq and return the assistant's reply text.
 */
export async function handleChatRequest(
  messages: ChatMessage[],
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[/api/chat] GROQ_API_KEY is not set. Add it in Settings → Environment.");
    throw new Error(
      "GROQ_API_KEY environment variable is not configured. " +
        "Add it in Settings → Environment.",
    );
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const msg =
      (body as any)?.error?.message || `Groq API error (${response.status})`;
    console.error(`[/api/chat] Groq API returned ${response.status}:`, body);
    throw new Error(msg);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return data.choices?.[0]?.message?.content ?? "";
}
