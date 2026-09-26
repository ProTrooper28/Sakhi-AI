/**
 * Sakhi AI — Frontend client for the /api/chat backend endpoint.
 *
 * Supports streaming (SSE) and non-streaming modes. The backend picks the
 * provider (Gemini first, Groq fallback) — the API key is NEVER exposed to
 * the browser; all AI calls happen server-side (Vite dev middleware in dev,
 * a serverless function in production).
 */

export interface ChatApiMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Snapshot of live app state attached to every request so the AI is
 * situationally aware (active journey, SOS mode, armed triggers, guardian
 * link) without the user repeating themselves.
 */
export interface ChatUserContext {
  userName?: string;
  sosActive?: boolean;
  journeyStatus?: "active" | "planning" | "completed" | "none";
  journeyDestination?: string;
  voiceEnabled?: boolean;
  shakeEnabled?: boolean;
  guardianLinked?: boolean;
  locationLabel?: string;
  localTime?: string;
}

/**
 * Send the conversation history to the backend and return the full AI reply.
 * Non-streaming fallback — throws on network or server errors.
 */
export async function sendMessageToApi(
  messages: ChatApiMessage[],
  context?: ChatUserContext,
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, stream: false, context }),
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

/**
 * Stream the AI reply token-by-token via SSE.
 * Calls `onToken` for each token and `onDone` when the stream finishes.
 * Returns a cleanup function to abort the stream.
 */
export function streamMessageToApi(
  messages: ChatApiMessage[],
  context: ChatUserContext | undefined,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, stream: true, context }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ||
            `Request failed (${response.status})`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      // Detect a stream that ends with an error event before any token was
      // delivered (e.g. every upstream retry failed) — the caller can then
      // fall back to the non-streaming endpoint instead of showing an error.
      let sawToken = false;
      let streamError: string | null = null;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              streamError = parsed.error;
              continue;
            }
            if (parsed.token) {
              sawToken = true;
              onToken(parsed.token);
            }
          } catch (e: any) {
            if (e.message && !e.message.includes("JSON")) throw e;
          }
        }
      }
      // Stream ended with an error and nothing was streamed — retry once via
      // the non-streaming endpoint (the server may have exhausted its own
      // upstream retries during a provider hiccup).
      if (!sawToken) {
        try {
          const content = await sendMessageToApi(messages, context);
          if (content) {
            onToken(content);
            onDone();
            return;
          }
        } catch {
          /* fall through to the original error below */
        }
      }
      if (streamError) throw new Error(streamError);
      onDone();
    } catch (err: any) {
      if (err.name === "AbortError") return;
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return () => controller.abort();
}
