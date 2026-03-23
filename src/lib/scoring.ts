import type { RawArticle } from "./types";

export function computeRankScore(article: RawArticle): number {
  let score = 0;

  // Recency bonus
  const ageHours = (Date.now() - new Date(article.pubDate).getTime()) / (1000 * 60 * 60);
  if (ageHours < 12) score += 10;
  else if (ageHours < 24) score += 5;

  // Engagement (HN points)
  if (article.points) score += Math.min(article.points / 10, 20);

  // Source tier bonus
  const tier1 = ["Hacker News", "TechCrunch AI", "The Verge", "Reuters"];
  const tier2 = ["a16z", "Ars Technica"];
  if (tier1.includes(article.source)) score += 5;
  else if (tier2.includes(article.source)) score += 3;

  // AI/tech keyword boost
  const aiKeywords = ["ai", "agent", "llm", "claude", "openai", "model", "startup", "funding", "mastra", "mcp"];
  const titleLower = article.title.toLowerCase();
  for (const kw of aiKeywords) {
    if (titleLower.includes(kw)) { score += 2; break; }
  }

  // Persona relevance boost (Eugene-specific)
  const text = (article.title + " " + article.snippet).toLowerCase();
  if (/indonesia|jakarta|gojek|tokopedia|grab|southeast asia|sea\b/.test(text)) score += 8;
  if (/\bagent|agentic|tool use|function call|mcp\b/.test(text)) score += 5;
  if (/product|plg|activation|retention|conversion|onboard/.test(text)) score += 3;
  if (/sourcing|procurement|supply chain|b2b marketplace|commodit/.test(text)) score += 4;

  return score;
}

export function deduplicateAndRank(articles: RawArticle[]): RawArticle[] {
  const seen = new Map<string, RawArticle>();

  for (const article of articles) {
    const key = article.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 6)
      .join(" ");

    if (seen.has(key)) {
      const existing = seen.get(key)!;
      if ((article.points || 0) > (existing.points || 0)) {
        seen.set(key, article);
      }
    } else {
      seen.set(key, article);
    }
  }

  return [...seen.values()]
    .map((a) => ({ ...a, _score: computeRankScore(a) }))
    .sort((a, b) => (b as any)._score - (a as any)._score)
    .slice(0, 12)
    .map(({ _score, ...a }: any) => a);
}
