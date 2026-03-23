import { fetchRssTool } from "@/mastra/tools/fetch-rss";
import { fetchHackerNewsTool } from "@/mastra/tools/fetch-hackernews";
import { fetchNewsApiTool } from "@/mastra/tools/fetch-newsapi";
import { sendEmailTool } from "@/mastra/tools/send-email";
import { newsAnalyst } from "@/mastra/agents/news-analyst";
import { digestComposer } from "@/mastra/agents/digest-composer";
import { saveDigest, slugify, listDigestDates, getDigest } from "./storage";
import type { RawArticle, Segment, SegmentStory, Correlation, DailyDigest, SegmentName } from "./types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eugene-news.vercel.app";

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
      { feedUrl: "https://jakartaglobe.id/feed", source: "Jakarta Globe", limit: 5 },
      { feedUrl: "https://www.techinasia.com/feed", source: "Tech in Asia", limit: 5 },
    ],
    newsapi: [
      { query: "Indonesia technology OR Jakarta startup", limit: 5 },
      { query: "Southeast Asia economy OR ASEAN", limit: 3 },
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
    const digest = await getDigest(d);
    if (digest) {
      for (const seg of digest.segments) {
        for (const s of seg.stories) {
          recentTitles.add(normalizeTitle(s.title));
        }
      }
    }
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

  const response = await newsAnalyst.generate(
    `You are the ${advisorLens} analyzing ${segmentName} news for Eugene (Product Builder at Sourcy Global, Jakarta, AI agents/PLG expert).

Pick the TOP 2-3 most important stories ONLY. Skip noise.

STORIES:
${articlesJson}

Output a JSON object (NO markdown fences, raw JSON only):
{
  "tldr": "1-2 sentence segment summary",
  "stories": [
    {
      "title": "exact title",
      "link": "url",
      "source": "source name",
      "tldr": "1 sentence max",
      "soWhat": "Why Eugene should care (1 sentence)",
      "problem": "What problem this reveals (1 sentence)",
      "opportunity": "What opportunity this creates, or null",
      "relevanceScore": 8
    }
  ]
}

Rules:
- MAX 3 stories. Quality over quantity.
- Every field must be SHORT (1 sentence max).
- problem/opportunity framing: think like a PM analyzing the market.
- soWhat must be personal to Eugene's work (Sourcy, AI agents, Indonesia, PLG).
- Skip anything that's noise or hype without substance.
- Start with { and end with }. NO backticks.`
  );

  const parsed = parseGeminiJson(response.text);
  if (!parsed || !parsed.stories) {
    console.log(`   ${segmentName}: parse failed`);
    return { name: segmentName, icon: getSegmentIcon(segmentName), stories: [], tldr: "Analysis failed.", advisorLens };
  }

  const stories: SegmentStory[] = parsed.stories.map((s: any) => ({
    id: slugify(s.title || "untitled"),
    title: s.title || "Untitled",
    link: s.link || "",
    source: s.source || "",
    pubDate: articles.find((a) => normalizeTitle(a.title) === normalizeTitle(s.title))?.pubDate || new Date().toISOString(),
    tldr: s.tldr || "",
    soWhat: s.soWhat || "",
    problem: s.problem || "",
    opportunity: s.opportunity || null,
    advisorLens,
    relevanceScore: s.relevanceScore || 5,
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
    `You are Eugene's Board of Advisors doing cross-segment intelligence. Find CONNECTIONS between these news segments.

${summaries}

Eugene's context: Lead Product Builder at Sourcy Global (B2B commodities sourcing, Jakarta). Builds AI agents. Interested in PLG, career growth, Indonesia market.

Find 2-4 cross-segment connections. Think:
- How does a macro event affect Indonesian business?
- How does an AI breakthrough connect to a startup trend?
- How does a geopolitical shift impact supply chains (Sourcy)?
- What second-order effects link these segments?

Output a JSON array (NO markdown, raw JSON):
[{"segmentA":"Tech + AI","segmentB":"Indonesia & SEA","connection":"1 sentence linking them","implication":"so-what for Eugene, 1 sentence","confidence":"high|medium|speculative"}]

Start with [ end with ]. Max 4 items. Be specific, not generic.`
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

// === STEP 6: COMPOSE EMAIL ===
async function composeEmail(digest: DailyDigest): Promise<{ subject: string; htmlBody: string }> {
  console.log("Step 6: Composing segment-based email...");

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const segmentSummary = digest.segments.map((s) =>
    `${s.icon} ${s.name} (${s.advisorLens}):\nSegment TLDR: ${s.tldr}\n${s.stories.map((st) => `- "${st.title}" [${st.source}]: ${st.tldr} | So what: ${st.soWhat} | ID: ${st.id}`).join("\n")}`
  ).join("\n\n");

  const correlationSummary = digest.correlations.map((c) =>
    `${c.segmentA} ↔ ${c.segmentB}: ${c.connection} → ${c.implication} [${c.confidence}]`
  ).join("\n");

  const response = await digestComposer.generate(
    `Compose today's segment-based news digest email.

DATE: ${today}
HEADLINE: ${digest.headline}
APP_URL: ${APP_URL}
DATE_PARAM: ${digest.date}

SEGMENTS:
${segmentSummary}

CONNECTIONS:
${correlationSummary}

ACTION ITEMS:
${JSON.stringify(digest.actionItems.slice(0, 3))}

EMAIL LAYOUT:
1. Header: "${digest.headline}" + date
2. For each segment: icon + name, segment TLDR, then 2-3 story cards with title, source, TLDR, soWhat. Each story has "Go Deeper →" link: ${APP_URL}/story/{ID}?date=${digest.date}
3. CONNECTIONS section: 2-4 cards showing segment A ↔ segment B with arrow
4. ACTION ITEMS: top 3 checkboxes
5. Footer

Keep it SCANNABLE. Under 3 minutes to read. Each story is 2 lines max.`
  );

  return {
    subject: `Your Daily Brief — ${digest.headline}`,
    htmlBody: response.text,
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

  // Step 4: Find correlations
  console.log("Step 4: Finding cross-segment correlations...");
  const correlations = await findCorrelations(segments);
  console.log(`   Found ${correlations.length} connections`);

  // Step 5: Deep dive on top stories
  await deepDiveTopStories(segments);

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

  // Compose & deliver email
  const { subject, htmlBody } = await composeEmail(digest);

  if (process.env.RESEND_API_KEY && process.env.RECIPIENT_EMAIL) {
    const result = (await sendEmailTool.execute!({ subject, htmlBody }, {} as any)) as any;
    if (result.success) console.log(`Email sent to ${process.env.RECIPIENT_EMAIL}`);
    else console.log(`Email failed: ${result.error}`);
  }

  // Save HTML locally
  const fs = await import("fs");
  fs.writeFileSync(`digest-${date}.html`, htmlBody);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone! ${analyzed} stories, ${correlations.length} connections in ${elapsed}s\n`);

  return digest;
}
