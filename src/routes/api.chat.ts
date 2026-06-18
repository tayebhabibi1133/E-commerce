import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM = `You are Souqly's AI shopping assistant — an expert at helping customers discover, compare, and choose products on a multi-vendor marketplace.
Be concise, friendly, and helpful. When the user describes a need (e.g. "laptop under $500 for programming"), suggest 2-4 representative options with key specs, pros/cons, and rough price ranges, and recommend they search Souqly using suggested keywords or category filters.
Use markdown (lists, bold). Never invent specific product IDs or fake reviews. If unsure, ask one clarifying question.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(messages)) return new Response("Bad request", { status: 400 });
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages as UIMessage[] });
      },
    },
  },
});
