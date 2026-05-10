/**
 * DeepSeek API integration for food analysis
 * Uses the same interface as _core/llm.ts but calls DeepSeek instead of Manus Forge
 */

import type { InvokeParams, InvokeResult } from "./_core/llm";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat"; // V3 model with vision support

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }
  return key;
}

/**
 * Call DeepSeek API with the same interface as invokeLLM
 * Supports text and vision (image_url) messages
 */
export async function invokeDeepSeek(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = getApiKey();

  const { messages, response_format, responseFormat } = params;

  // Normalize messages to DeepSeek format (OpenAI-compatible)
  const normalizedMessages = messages.map((msg) => {
    if (typeof msg.content === "string") {
      return { role: msg.role, content: msg.content };
    }

    // Array content (text + image_url)
    const parts = Array.isArray(msg.content) ? msg.content : [msg.content];
    const normalizedParts = parts.map((part) => {
      if (typeof part === "string") {
        return { type: "text" as const, text: part };
      }
      if (part.type === "text") {
        return { type: "text" as const, text: part.text };
      }
      if (part.type === "image_url") {
        return {
          type: "image_url" as const,
          image_url: { url: part.image_url.url },
        };
      }
      // file_url not supported by DeepSeek, convert to text
      return { type: "text" as const, text: `[File: ${(part as any).file_url?.url}]` };
    });

    return { role: msg.role, content: normalizedParts };
  });

  const payload: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
    messages: normalizedMessages,
    max_tokens: 4096,
  };

  const format = responseFormat || response_format;
  if (format) {
    payload.response_format = format;
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API failed: ${response.status} ${response.statusText} – ${errorText}`);
  }

  return (await response.json()) as InvokeResult;
}
