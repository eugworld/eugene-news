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
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) try { return JSON.parse(arrMatch[0]); } catch {}
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) try { return JSON.parse(`[${objMatch[0]}]`); } catch {}
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

    console.log(`Generating perspectives for: ${story.title}`);

    // Generate 7 advisor perspectives
    const response = await newsAnalyst.generate(
      `Generate exactly 7 advisor perspectives for this news story.

Story: "${story.title}"
Source: ${story.source}
Summary: ${story.tldr || "N/A"}
Context: Eugene is a Product Builder at Sourcy Global (Jakarta), building AI agents for B2B commodities sourcing.

For EACH of these 7 advisors, provide a unique perspective:
1. Tech Expert - technical implications
2. CEO Advisor - business/market strategy
3. PM Expert - product thinking
4. Career Expert - career/hiring impact
5. Marketing Expert - distribution/growth angle
6. Design Expert - UX/design patterns
7. Devil's Advocate - contrarian view, what's overhyped

Return a JSON array with EXACTLY 7 objects:
[
  {"advisor": "Tech Expert", "soWhat": "Technical insight in 1 sentence", "actionItem": "Concrete next step or null", "relevanceScore": 7, "challenge": "Provocative question for Eugene"},
  {"advisor": "CEO Advisor", "soWhat": "...", "actionItem": "...", "relevanceScore": 7, "challenge": "..."},
  ...5 more advisors
]

RULES:
- EXACTLY 7 items in the array, one per advisor
- Every soWhat MUST be filled with a non-empty insight
- challenge should push back on assumptions
- Raw JSON array only. Start with [ end with ]. NO markdown fences.`
    );

    console.log(`Perspectives raw response (first 200): ${response.text.slice(0, 200)}`);

    const parsed = parseGeminiJson(response.text);
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      console.error(`Failed to parse perspectives. Raw: ${response.text.slice(0, 500)}`);
      return NextResponse.json({ error: "Failed to generate perspectives", raw: response.text.slice(0, 200) }, { status: 500 });
    }

    const perspectives: AdvisorPerspective[] = parsed.map((p: any) => ({
      advisor: p.advisor || "Unknown",
      soWhat: p.soWhat || p.so_what || p.sowhat || "No perspective available",
      actionItem: p.actionItem || p.action_item || null,
      relevanceScore: p.relevanceScore || p.relevance_score || 5,
      challenge: p.challenge || null,
    }));

    // Save back to digest
    try {
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
        console.log(`Saved ${perspectives.length} perspectives for ${storyId}`);
      }
    } catch (saveErr) {
      console.error("Failed to save perspectives:", saveErr);
      // Still return perspectives even if save fails
    }

    return NextResponse.json({ perspectives });
  } catch (error: any) {
    console.error("Perspectives error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
