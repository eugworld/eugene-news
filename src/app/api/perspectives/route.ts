import { NextRequest, NextResponse } from "next/server";
import { getStory, getDigest, saveDigest } from "@/lib/storage";
import { newsAnalyst } from "@/mastra/agents/news-analyst";
import type { AdvisorPerspective } from "@/lib/types";

export const maxDuration = 30;

function parseGeminiJson(text: string): any {
  let cleaned = text.replace(/^```(?:json)?[\s\n]*/i, "").replace(/[\s\n]*```[\s\n]*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) try { return JSON.parse(match[0]); } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { storyId, date } = await req.json();
    if (!storyId || !date) {
      return NextResponse.json({ error: "storyId and date required" }, { status: 400 });
    }

    const story = await getStory(date, storyId);
    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    // Already generated?
    if (story.perspectives && story.perspectives.length > 0) {
      return NextResponse.json({ perspectives: story.perspectives });
    }

    // Generate 7 advisor perspectives
    const response = await newsAnalyst.generate(
      `Generate 7 advisor perspectives for this story. MAX 15 words per field.

Story: "${story.title}"
TL;DR: ${story.tldr}
So What: ${story.soWhat}
Problem: ${story.problem}

Advisors: Tech Expert, CEO Advisor, PM Expert, Career Expert, Marketing Expert, Design Expert, Devil's Advocate.

Output JSON array: [{"advisor":"Tech Expert","soWhat":"short","actionItem":"or null","relevanceScore":7,"challenge":"short question"}]

7 items total. Raw JSON only. No backticks. Start with [.`
    );

    const parsed = parseGeminiJson(response.text);
    if (!parsed || !Array.isArray(parsed)) {
      return NextResponse.json({ error: "Failed to generate perspectives" }, { status: 500 });
    }

    const perspectives: AdvisorPerspective[] = parsed.map((p: any) => ({
      advisor: p.advisor || "Tech Expert",
      soWhat: p.soWhat || "",
      actionItem: p.actionItem || null,
      relevanceScore: p.relevanceScore || 5,
      challenge: p.challenge || null,
    }));

    // Save back to digest
    const digest = await getDigest(date);
    if (digest) {
      for (const seg of digest.segments) {
        const found = seg.stories.find((s) => s.id === storyId);
        if (found) {
          found.perspectives = perspectives;
          break;
        }
      }
      await saveDigest(date, digest);
    }

    return NextResponse.json({ perspectives });
  } catch (error: any) {
    console.error("Perspectives error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
