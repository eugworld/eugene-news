import { fetchRssTool } from "@/mastra/tools/fetch-rss";
import { fetchHackerNewsTool } from "@/mastra/tools/fetch-hackernews";
import { fetchNewsApiTool } from "@/mastra/tools/fetch-newsapi";
import { sendEmailTool } from "@/mastra/tools/send-email";
import { newsAnalyst } from "@/mastra/agents/news-analyst";
// digestComposer removed — using deterministic HTML template for speed
import { saveDigest, slugify, listDigestDates, getDigest } from "./storage";
import type { RawArticle, Segment, SegmentStory, Correlation, DailyDigest, SegmentName } from "./types";

// Always use production URL in emails (even when triggered locally)
const APP_URL = "https://news-agent-mastra.vercel.app";

// === SOURCE CONFIGURATION BY SEGMENT ===
const SEGMENT_SOURCES: Record<SegmentName, { rss: { feedUrl: string; source: string; limit: number }[]; hn?: { query: string }; newsapi?: { query: string; limit: number }[] }> = {
  "Tech + AI": {
    rss: [
      { feedUrl: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch AI", limit: 8 },
      { feedUrl: "https://feeds.arstechnica.com/arstechnica/technology-lab", source: "Ars Technica", limit: 5 },
      { feedUrl: "https://www.theverge.com/rss/index.xml", source: "The Verge", limit: 5 },
    ],
    hn: { query: "" },
  },
  "Startup World": {
    rss: [
      { feedUrl: "https://techcrunch.com/feed/", source: "TechCrunch", limit: 8 },
      { feedUrl: "https://a16z.com/feed/", source: "a16z", limit: 5 },
    ],
    newsapi: [{ query: "startup funding OR series A OR seed round", limit: 5 }],
  },
  "Macro & Geopolitics": {
    rss: [
      { feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World", limit: 8 },
      { feedUrl: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC Business", limit: 5 },
    ],
    newsapi: [
      { query: "geopolitics OR trade war OR sanctions OR oil prices", limit: 5 },
      { query: "macroeconomics OR interest rates OR inflation OR recession", limit: 3 },
    ],
  },
  "Indonesia & SEA": {
    rss: [
      { feedUrl: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511", source: "CNA Asia", limit: 8 },
      { feedUrl: "https://www.straitstimes.com/news/asia/rss.xml", source: "Straits Times", limit: 8 },
      { feedUrl: "https://restofworld.org/feed/", source: "Rest of World", limit: 5 },
      { feedUrl: "https://www.scmp.com/rss/91/feed", source: "SCMP Asia", limit: 5 },
    ],
    newsapi: [
      { query: "Indonesia economy OR Jakarta startup OR Indonesian rupiah", limit: 5 },
      { query: "Southeast Asia technology OR ASEAN trade", limit: 3 },
    ],
  },
};

// === GEMINI JSON PARSER ===
function parseGeminiJson(text: string): any {
  let cleaned = text.replace(/^```(?:json)?[\s\n]*/i, "").replace(/[\s\n]*```[\s\n]*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) try { return JSON.parse(objMatch[0]); } catch {}
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) try { return JSON.parse(arrMatch[0]); } catch {}
  return null;
}

// === STEP 1: FETCH BY SEGMENT ===
async function fetchForSegment(segmentName: SegmentName): Promise<{ articles: RawArticle[]; errors: string[] }> {
  const config = SEGMENT_SOURCES[segmentName];
  const errors: string[] = [];
  const articles: RawArticle[] = [];

  // RSS feeds
  const rssResults = await Promise.allSettled(
    config.rss.map((feed) => fetchRssTool.execute!(feed, {} as any))
  );
  for (const result of rssResults) {
    if (result.status === "fulfilled") {
      const data = result.value as any;
      if (data.error) errors.push(data.error);
      if (data.articles) articles.push(...data.articles.map((a: any) => ({ ...a, segment: segmentName })));
    }
  }

  // Hacker News
  if (config.hn) {
    try {
      const hn = (await fetchHackerNewsTool.execute!({ limit: 10, hoursBack: 24, ...config.hn }, {} as any)) as any;
      if (hn.articles) articles.push(...hn.articles.map((a: any) => ({ ...a, segment: segmentName })));
    } catch (e: any) { errors.push(`HN: ${e.message}`); }
  }

  // NewsAPI
  if (config.newsapi && process.env.NEWS_API_KEY) {
    const newsResults = await Promise.allSettled(
      config.newsapi.map((q) => fetchNewsApiTool.execute!(q, {} as any))
    );
    for (const r of newsResults) {
      if (r.status === "fulfilled") {
        const d = r.value as any;
        if (d.articles) articles.push(...d.articles.map((a: any) => ({ ...a, segment: segmentName })));
      }
    }
  }

  return { articles, errors };
}

// === STEP 2: DEDUP + ROLLING WINDOW ===
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim().split(" ").slice(0, 6).join(" ");
}

async function dedupWithHistory(articles: RawArticle[]): Promise<RawArticle[]> {
  // Load last 3 days of digests for dedup
  const recentTitles = new Set<string>();
  const dates = await listDigestDates();
  for (const d of dates.slice(0, 3)) {
    try {
      const digest = await getDigest(d);
      if (digest?.segments) {
        for (const seg of digest.segments) {
          for (const s of seg.stories || []) {
            recentTitles.add(normalizeTitle(s.title));
          }
        }
      }
    } catch {}
  }

  // Dedup within today's articles
  const seen = new Map<string, RawArticle>();
  for (const a of articles) {
    const key = normalizeTitle(a.title);
    if (recentTitles.has(key)) continue; // Skip stories from previous days
    if (!seen.has(key) || (a.points || 0) > (seen.get(key)!.points || 0)) {
      seen.set(key, a);
    }
  }

  return [...seen.values()];
}

// === STEP 3: ANALYZE SEGMENT ===
async function analyzeSegment(segmentName: SegmentName, advisorLens: string, articles: RawArticle[]): Promise<Segment> {
  if (articles.length === 0) {
    return { name: segmentName, icon: getSegmentIcon(segmentName), stories: [], tldr: "No new stories today.", advisorLens };
  }

  const articlesJson = JSON.stringify(
    articles.slice(0, 8).map((a) => ({ title: a.title, link: a.link, source: a.source, snippet: a.snippet.slice(0, 150) })),
    null, 2
  );

  // Force each segment to use a DIFFERENT life lens — prevents all-Sourcy bias
  const segmentLens: Record<string, { primary: string; forbidden: string; examples: string }> = {
    "Tech + AI": {
      primary: "YOUR IDENTITY AS AN AI BUILDER. How does this change what you build, how you build it, or your path to becoming an AI PM thought leader?",
      forbidden: "Do NOT mention Sourcy in soWhat. This segment is about Eugene as a BUILDER and CRAFTSMAN.",
      examples: 'Good: "As someone shipping agents with Mastra/Gemini, this means you should switch to X" or "For your Stripe/Google PM application, knowing this gives you an edge in system design interviews"',
    },
    "Startup World": {
      primary: "CHOYS (AI L&D platform) and CAREER GOALS. What can you steal for Choys? What does this mean for your tier-1 company ambitions?",
      forbidden: "Do NOT default to Sourcy. At least 2 of 3 stories must reference Choys or career goals.",
      examples: 'Good: "For Choys, this pricing model validates/challenges your enterprise approach" or "If you\'re applying to Stripe, this is exactly the kind of 0-to-1 thinking they test for"',
    },
    "Macro & Geopolitics": {
      primary: "YOUR PERSONAL FINANCES AND LIFE IN JAKARTA. How does this affect your rupiah savings, IDX investments, cost of living, or daily life as an Indonesian?",
      forbidden: "Do NOT frame as 'Sourcy could build an agent for this.' Frame as: how does this hit YOUR wallet, your deposits, your purchasing power?",
      examples: 'Good: "Oil above $100 means your Jakarta transport costs jump 15-20% and rupiah weakens — consider moving deposits to USD-denominated assets" or "This trade war hits Indonesian exports, which means IDX dips — good time to dollar-cost average"',
    },
    "Indonesia & SEA": {
      primary: "Mix of ALL lenses — Sourcy, Choys, personal life, career. But be SPECIFIC about Indonesia impact on Eugene's daily reality.",
      forbidden: "Do NOT be generic about 'Southeast Asia.' Be specific about Jakarta, rupiah, Indonesian regulations, Indonesian consumer behavior.",
      examples: 'Good: "This Indonesian regulation change means Choys needs to update its data handling for enterprise clients" or "Prabowo\'s fiscal policy directly affects your startup runway — here\'s how"',
    },
  };

  const lens = segmentLens[segmentName] || segmentLens["Indonesia & SEA"];

  const response = await newsAnalyst.generate(
    `Analyze ${segmentName} news. Pick TOP 2-3 stories.

PRIMARY LENS FOR THIS SEGMENT: ${lens.primary}
CONSTRAINT: ${lens.forbidden}
EXAMPLES OF GOOD soWhat: ${lens.examples}

EUGENE'S CONTEXT:
- AI builder (Claude/Gemini/Mastra/Vercel) — wants to be THE AI PM thought leader
- Sourcy Global (day job): B2B commodities sourcing, Jakarta
- Choys (side business): AI-powered corporate L&D, 3 enterprise clients
- Career: Wants to join Google/Stripe within 1-2 years
- Jakarta life: Rupiah deposits, IDX exposure, oil prices affect his commute and groceries
- Blind spots: ships before validating, builds tools then doesn't use them, job-hops

STORIES:
${articlesJson}

Return JSON:
{
  "tldr": "Sharp summary — what happened and why it matters for the PRIMARY LENS above",
  "stories": [
    {
      "title": "exact title from input",
      "link": "exact url from input",
      "source": "source name from input",
      "tldr": "What happened (1 sentence)",
      "soWhat": "Use the PRIMARY LENS above. Address Eugene as 'you'. Be sharp, opinionated, challenging. Max 2 sentences.",
      "problem": "The real tension or risk — be specific. Max 1 sentence.",
      "opportunity": "Specific action for THIS WEEK with a concrete deliverable, or null. Not 'could explore' — name the tool, the deadline, the output.",
      "relevanceScore": 7
    }
  ]
}

MAX 3 stories. Raw JSON only. Start with { end with }.`
  );

  const parsed = parseGeminiJson(response.text);
  if (!parsed || !parsed.stories) {
    console.log(`   ${segmentName}: parse failed. Raw response: ${response.text.slice(0, 300)}`);
    return { name: segmentName, icon: getSegmentIcon(segmentName), stories: [], tldr: "Analysis failed.", advisorLens };
  }

  // Log first story fields to debug empty values
  if (parsed.stories[0]) {
    const s0 = parsed.stories[0];
    console.log(`   ${segmentName} sample: soWhat="${s0.soWhat || s0.so_what || ''}", problem="${s0.problem || ''}", so_what="${s0.so_what || 'N/A'}"`);
  }

  const stories: SegmentStory[] = parsed.stories.map((s: any) => ({
    id: slugify(s.title || "untitled"),
    title: s.title || "Untitled",
    link: s.link || "",
    source: s.source || "",
    pubDate: articles.find((a) => normalizeTitle(a.title) === normalizeTitle(s.title))?.pubDate || new Date().toISOString(),
    tldr: s.tldr || "",
    // Handle both camelCase and snake_case from Gemini
    soWhat: s.soWhat || s.so_what || s.sowhat || "",
    problem: s.problem || "",
    opportunity: s.opportunity || null,
    advisorLens,
    relevanceScore: s.relevanceScore || s.relevance_score || 5,
    perspectives: [],
  }));

  return { name: segmentName, icon: getSegmentIcon(segmentName), stories, tldr: parsed.tldr || "", advisorLens };
}

function getSegmentIcon(name: SegmentName): string {
  const icons: Record<string, string> = { "Tech + AI": "🤖", "Startup World": "💰", "Macro & Geopolitics": "🌍", "Indonesia & SEA": "🇮🇩" };
  return icons[name] || "📰";
}

// === STEP 4: CORRELATION AGENT ===
async function findCorrelations(segments: Segment[]): Promise<Correlation[]> {
  const summaries = segments.map((s) =>
    `${s.icon} ${s.name}: ${s.tldr}\nStories: ${s.stories.map((st) => `- ${st.title}: ${st.tldr}`).join("\n")}`
  ).join("\n\n");

  const response = await newsAnalyst.generate(
    `Find 2-4 cross-segment connections that Eugene would miss if he only read one segment.

${summaries}

EUGENE'S CONTEXT: AI builder (ships agents with Claude/Gemini), Sourcy Global (B2B sourcing, Jakarta), Choys (AI L&D platform), career goal = join Google/Stripe, lives in Jakarta (rupiah, IDX, Indonesian consumer).

Think second-order effects:
- How does a macro event affect Eugene's rupiah savings or IDX investments?
- How does an AI tool connect to a geopolitical shift?
- What does a startup trend + Indonesia news mean for Choys or Sourcy?
- What career signal emerges when you combine two segments?

Output JSON array. Be SPECIFIC — name the mechanism, not just "these are related":
[{"segmentA":"Tech + AI","segmentB":"Indonesia & SEA","connection":"Specific mechanism linking them","implication":"What YOU should do about it — direct, actionable, personal","confidence":"high|medium|speculative"}]

Start with [ end with ]. Max 4 items. Raw JSON only.`
  );

  const parsed = parseGeminiJson(response.text);
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed.map((c: any) => ({
    segmentA: c.segmentA || "",
    segmentB: c.segmentB || "",
    connection: c.connection || "",
    implication: c.implication || "",
    confidence: c.confidence || "medium",
  }));
}

// === STEP 5: DEEP DIVE (7 advisors for top story per segment) ===
async function deepDiveTopStories(segments: Segment[]): Promise<void> {
  const topStories = segments.flatMap((s) => s.stories).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 4);
  if (topStories.length === 0) return;

  console.log(`Step 5: Deep dive (7 advisors) on top ${topStories.length} stories...`);

  const storiesJson = JSON.stringify(topStories.map((s) => ({ title: s.title, tldr: s.tldr, soWhat: s.soWhat })), null, 2);

  const response = await newsAnalyst.generate(
    `For these top stories, give ALL 7 advisor perspectives. MAX 12 words per soWhat. MAX 8 words per challenge.

${storiesJson}

Advisors: Tech Expert, CEO Advisor, PM Expert, Career Expert, Marketing Expert, Design Expert, Devil's Advocate.

Output JSON array: [{"title":"...","perspectives":[{"advisor":"Tech Expert","soWhat":"short","actionItem":"or null","relevanceScore":7,"challenge":"short question"},...7 total]}]

Raw JSON only. No backticks. Start with [.`
  );

  const parsed = parseGeminiJson(response.text);
  if (parsed && Array.isArray(parsed)) {
    for (const deep of parsed) {
      const story = topStories.find((s) => normalizeTitle(s.title) === normalizeTitle(deep.title));
      if (story && deep.perspectives) {
        story.perspectives = deep.perspectives.map((p: any) => ({
          advisor: p.advisor || "Tech Expert",
          soWhat: p.soWhat || "",
          actionItem: p.actionItem || null,
          relevanceScore: p.relevanceScore || 5,
          challenge: p.challenge || null,
        }));
      }
    }
  }
}

// === STEP 6: COMPOSE EMAIL (deterministic HTML, no AI call needed) ===
function composeEmailHtml(digest: DailyDigest): { subject: string; htmlBody: string } {
  console.log("Step 6: Composing email (template-based, no AI call)...");

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const segmentColors: Record<string, string> = { "Tech + AI": "#3B82F6", "Startup World": "#8B5CF6", "Macro & Geopolitics": "#F59E0B", "Indonesia & SEA": "#EF4444" };

  const segmentsHtml = digest.segments.map((s) => {
    const color = segmentColors[s.name] || "#6B7280";
    const storiesHtml = s.stories.map((st) => `
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="margin-bottom:4px;">
          <span style="font-size:12px;color:#6B7280;background:#F3F4F6;padding:2px 8px;border-radius:4px;">${st.source}</span>
          <span style="font-size:12px;font-weight:600;color:${st.relevanceScore >= 8 ? '#2ABFAB' : '#F59E0B'};margin-left:8px;">${st.relevanceScore}/10</span>
        </div>
        <h3 style="margin:8px 0 4px;font-size:16px;"><a href="${st.link}" style="color:#1E40AF;text-decoration:none;">${st.title}</a></h3>
        <p style="font-size:14px;color:#374151;margin:4px 0;">${st.tldr}</p>
        <p style="font-size:13px;color:#6B7280;margin:4px 0;"><strong>So what:</strong> ${st.soWhat}</p>
        ${st.problem ? `<p style="font-size:12px;color:#6B7280;margin:4px 0;"><strong>Problem:</strong> ${st.problem}${st.opportunity ? ` · <strong>Opportunity:</strong> ${st.opportunity}` : ''}</p>` : ''}
        <a href="${APP_URL}/story/${st.id}?date=${digest.date}" style="display:inline-block;background:#2ABFAB;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;margin-top:8px;">Go Deeper →</a>
      </div>
    `).join("");

    return `
      <div style="margin-bottom:24px;">
        <div style="border-left:4px solid ${color};padding:12px 16px;background:#FAFAFA;border-radius:0 8px 8px 0;margin-bottom:12px;">
          <h2 style="margin:0;font-size:18px;">${s.icon} ${s.name}</h2>
          <p style="margin:4px 0 0;font-size:14px;color:#6B7280;">${s.tldr}</p>
        </div>
        ${storiesHtml}
      </div>
    `;
  }).join("");

  const correlationsHtml = digest.correlations.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h2 style="font-size:18px;margin-bottom:12px;">🔗 Connections</h2>
      ${digest.correlations.map((c) => `
        <div style="background:#F5F3FF;border:2px dashed #C4B5FD;border-radius:8px;padding:14px;margin-bottom:10px;">
          <div style="font-size:13px;font-weight:600;color:#7C3AED;margin-bottom:4px;">${c.segmentA} ↔ ${c.segmentB}</div>
          <p style="font-size:14px;margin:4px 0;">${c.connection}</p>
          <p style="font-size:13px;color:#6B7280;margin:4px 0;">→ ${c.implication}</p>
          <span style="font-size:11px;background:${c.confidence === 'high' ? '#D1FAE5' : c.confidence === 'medium' ? '#FEF3C7' : '#F3F4F6'};color:${c.confidence === 'high' ? '#065F46' : c.confidence === 'medium' ? '#92400E' : '#6B7280'};padding:2px 8px;border-radius:4px;">${c.confidence}</span>
        </div>
      `).join("")}
    </div>
  ` : "";

  const actionHtml = digest.actionItems.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h2 style="font-size:18px;margin-bottom:12px;">✅ Action Items</h2>
      ${digest.actionItems.map((a) => `<div style="font-size:14px;padding:8px 0;border-bottom:1px solid #E5E7EB;">☐ ${a}</div>`).join("")}
    </div>
  ` : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1F2937,#374151);color:#fff;padding:24px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;font-size:22px;font-weight:700;">${digest.headline}</h1>
    <p style="margin:8px 0 0;font-size:14px;color:#D1D5DB;">${today}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9CA3AF;">${digest.metadata.analyzed} stories · ${digest.correlations.length} connections</p>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #E5E7EB;border-top:0;">
    ${segmentsHtml}
    ${correlationsHtml}
    ${actionHtml}
  </div>
  <div style="text-align:center;padding:16px;font-size:12px;color:#9CA3AF;">
    <a href="${APP_URL}?date=${digest.date}" style="color:#2ABFAB;text-decoration:none;font-weight:600;">View Full Digest on Web</a>
    <br>Eugene's Board of Advisors · Powered by Gemini + Mastra
  </div>
</div>
</body>
</html>`;

  return {
    subject: `Your Daily Brief — ${digest.headline}`,
    htmlBody: html,
  };
}

// === MAIN PIPELINE ===
export async function runDigestPipeline(): Promise<DailyDigest> {
  const date = new Date().toISOString().split("T")[0];
  console.log(`\n=== Eugene News v3 — ${date} ===\n`);
  const start = Date.now();

  // Step 1: Fetch all segments in parallel
  console.log("Step 1: Fetching from all segments...");
  const fetchResults = await Promise.allSettled([
    fetchForSegment("Tech + AI"),
    fetchForSegment("Startup World"),
    fetchForSegment("Macro & Geopolitics"),
    fetchForSegment("Indonesia & SEA"),
  ]);

  const allArticles: Record<SegmentName, RawArticle[]> = {
    "Tech + AI": [], "Startup World": [], "Macro & Geopolitics": [], "Indonesia & SEA": [],
  };
  const allErrors: string[] = [];
  let totalFetched = 0;

  for (const [i, name] of (["Tech + AI", "Startup World", "Macro & Geopolitics", "Indonesia & SEA"] as SegmentName[]).entries()) {
    if (fetchResults[i].status === "fulfilled") {
      const { articles, errors } = fetchResults[i].value;
      allArticles[name] = articles;
      totalFetched += articles.length;
      allErrors.push(...errors);
      console.log(`   ${name}: ${articles.length} articles`);
    }
  }

  // Step 2: Dedup with rolling window
  console.log("Step 2: Dedup with rolling window...");
  let afterDedup = 0;
  for (const name of Object.keys(allArticles) as SegmentName[]) {
    allArticles[name] = await dedupWithHistory(allArticles[name]);
    afterDedup += allArticles[name].length;
  }
  console.log(`   ${totalFetched} → ${afterDedup} after dedup`);

  // Step 3: Analyze segments in parallel
  console.log("Step 3: Analyzing segments...");
  const segmentConfigs: { name: SegmentName; lens: string }[] = [
    { name: "Tech + AI", lens: "Tech Expert" },
    { name: "Startup World", lens: "CEO Advisor" },
    { name: "Macro & Geopolitics", lens: "CEO Advisor" },
    { name: "Indonesia & SEA", lens: "PM Expert" },
  ];

  const segmentResults = await Promise.allSettled(
    segmentConfigs.map((c) => analyzeSegment(c.name, c.lens, allArticles[c.name]))
  );

  const segments: Segment[] = segmentResults.map((r, i) =>
    r.status === "fulfilled" ? r.value : {
      name: segmentConfigs[i].name, icon: getSegmentIcon(segmentConfigs[i].name),
      stories: [], tldr: "Analysis failed.", advisorLens: segmentConfigs[i].lens,
    }
  );

  for (const s of segments) {
    console.log(`   ${s.icon} ${s.name}: ${s.stories.length} stories — ${s.tldr.slice(0, 60)}...`);
  }

  // Step 4: Find correlations (runs in parallel with nothing else so it's fast)
  console.log("Step 4: Finding cross-segment correlations...");
  const correlations = await findCorrelations(segments);
  console.log(`   Found ${correlations.length} connections`);

  // Step 5: Skip deep dive in pipeline (generated on-demand via /api/perspectives)
  // This saves ~15s of Gemini calls in the critical path
  console.log("Step 5: Skipped (on-demand via Go Deeper)");

  // Build action items from all stories
  const actionItems = segments
    .flatMap((s) => s.stories)
    .filter((st) => st.opportunity)
    .map((st) => st.opportunity!)
    .slice(0, 3);

  // Generate headline
  const topStory = segments.flatMap((s) => s.stories).sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
  const headline = topStory ? topStory.tldr.slice(0, 60) : "Your daily intelligence brief";

  const analyzed = segments.reduce((acc, s) => acc + s.stories.length, 0);

  const digest: DailyDigest = {
    date, generatedAt: new Date().toISOString(), headline,
    segments, correlations, actionItems,
    metadata: { totalFetched, afterDedup, analyzed, fetchErrors: allErrors },
  };

  // Save
  await saveDigest(date, digest);
  console.log(`\nSaved digest: ${analyzed} stories across ${segments.length} segments`);

  // Compose & deliver email (template-based, no AI call)
  const { subject, htmlBody } = composeEmailHtml(digest);

  if (process.env.RESEND_API_KEY && process.env.RECIPIENT_EMAIL) {
    const result = (await sendEmailTool.execute!({ subject, htmlBody }, {} as any)) as any;
    if (result.success) console.log(`Email sent to ${process.env.RECIPIENT_EMAIL}`);
    else console.log(`Email failed: ${result.error}`);
  }

  // Save HTML locally (only in dev)
  if (!process.env.VERCEL) {
    try {
      const fs = await import("fs");
      fs.writeFileSync(`digest-${date}.html`, htmlBody);
    } catch {}
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone! ${analyzed} stories, ${correlations.length} connections in ${elapsed}s\n`);

  return digest;
}
