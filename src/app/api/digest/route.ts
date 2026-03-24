import { NextRequest, NextResponse } from "next/server";
import { getDigest, getStory } from "@/lib/storage";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const slug = searchParams.get("slug");

  if (slug) {
    const story = await getStory(date, slug);
    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
    return NextResponse.json({ story });
  }

  const digest = await getDigest(date);
  if (!digest) return NextResponse.json({ error: "No digest for this date" }, { status: 404 });
  return NextResponse.json({ digest });
}

export async function POST() {
  try {
    const { runDigestPipeline } = await import("@/lib/digest-pipeline");
    const digest = await runDigestPipeline();
    return NextResponse.json({
      success: true,
      date: digest.date,
      headline: digest.headline,
      segments: digest.segments.map((s) => ({ name: s.name, stories: s.stories.length })),
      correlations: digest.correlations.length,
    });
  } catch (error: any) {
    console.error("Digest pipeline error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
