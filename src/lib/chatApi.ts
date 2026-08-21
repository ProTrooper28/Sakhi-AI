/**
 * Sakhi AI — Frontend client for the /api/chat backend endpoint.
 *
 * Supports both streaming (SSE) and non-streaming modes.
 * The API key is NEVER exposed to the browser; all Groq calls happen
 * server-side through the Vite dev middleware (dev) or a production
 * serverless function.
 */

export interface ChatApiMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Send the conversation history to the backend and return the full AI reply.
 * Non-streaming fallback — throws on network or server errors.
 */
export async function sendMessageToApi(
  messages: ChatApiMessage[],
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, stream: false }),
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
        body: JSON.stringify({ messages, stream: true }),
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
              throw new Error(parsed.error);
            }
            if (parsed.token) {
              onToken(parsed.token);
            }
          } catch (e: any) {
            if (e.message && !e.message.includes("JSON")) throw e;
          }
        }
      }
      onDone();
    } catch (err: any) {
      if (err.name === "AbortError") return;
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return () => controller.abort();
}
