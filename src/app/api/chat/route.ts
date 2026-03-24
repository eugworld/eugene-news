import { NextRequest } from "next/server";
import { chatAdvisor } from "@/mastra/agents/chat-advisor";
import { getStory } from "@/lib/storage";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { messages, storyId, date } = await req.json();

    let storyContext = "";
    if (storyId && date) {
      const story = await getStory(date, storyId);
      if (story) {
        storyContext = `
## STORY BEING DISCUSSED
Title: ${story.title}
Source: ${story.source}
TL;DR: ${story.tldr}
So What: ${story.soWhat}
Problem: ${story.problem}
Opportunity: ${story.opportunity || "None identified yet"}
Link: ${story.link}

${story.perspectives.length > 0 ? `## EXISTING ADVISOR PERSPECTIVES
${story.perspectives.map((p) => `**${p.advisor}** (${p.relevanceScore}/10): ${p.soWhat}${p.challenge ? ` | Challenge: "${p.challenge}"` : ""}`).join("\n")}` : ""}

Build on existing analysis. Go deeper when asked. Challenge Eugene's thinking.`;
      }
    }

    const contextMessages = [
      ...(storyContext ? [{ role: "system" as const, content: storyContext }] : []),
      ...messages.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const response = await chatAdvisor.stream(contextMessages);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) { controller.error(error); }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
