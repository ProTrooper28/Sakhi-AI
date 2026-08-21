#!/usr/bin/env node
// Quick test to verify Groq API works
const key = process.env.GROQ_API_KEY;
if (!key) {
  console.error("GROQ_API_KEY not found in process.env");
  process.exit(1);
}
console.log("GROQ_API_KEY found, length:", key.length);

fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + key,
  },
  body: JSON.stringify({
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: "What is 2+2? Reply with just the number." }],
    temperature: 0.7,
    max_tokens: 16,
  }),
})
  .then((r) => {
    console.log("HTTP status:", r.status);
    return r.json();
  })
  .then((d) => {
    console.log("Response:", JSON.stringify(d, null, 2));
  })
  .catch((e) => {
    console.error("Fetch error:", e);
  });
