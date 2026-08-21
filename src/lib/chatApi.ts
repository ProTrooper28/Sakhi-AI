/**
 * Sakhi AI — Frontend client for the /api/chat backend endpoint.
 *
 * The API key is NEVER exposed to the browser; all Groq calls happen
 * server-side through the Vite dev middleware (dev) or a production
 * serverless function.
 */

export interface ChatApiMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Send the conversation history to the backend and return the AI reply.
 * Throws on network or server errors so the caller can show error UI.
 */
export async function sendMessageToApi(
  messages: ChatApiMessage[],
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ||
        `Request failed (${response.status})`,
    );
  }

  const data = (await response.json()) as { content: string };
  return data.content;
}
