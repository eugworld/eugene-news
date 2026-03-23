import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
