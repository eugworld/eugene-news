import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // Allow up to 60s for the full pipeline

export async function GET(req: NextRequest) {
  // Vercel Hobby plan auto-protects cron endpoints
  // No manual CRON_SECRET check needed

  try {
    const { runDigestPipeline } = await import("@/lib/digest-pipeline");
    const digest = await runDigestPipeline();
    const totalStories = digest.segments.reduce((acc, s) => acc + s.stories.length, 0);
    return NextResponse.json({
      success: true,
      date: digest.date,
      headline: digest.headline,
      stories: totalStories,
      correlations: digest.correlations.length,
    });
  } catch (error: any) {
    console.error("Cron pipeline error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
