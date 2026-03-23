import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const NEWSAPI_BASE = "https://newsapi.org/v2";

export const fetchNewsApiTool = createTool({
  id: "fetch-newsapi",
  description:
    "Fetch news articles from NewsAPI.org. Covers 80,000+ sources. Free tier: 100 requests/day.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Search query (e.g. 'artificial intelligence', 'Indonesia tech')"),
    category: z
      .enum([
        "business",
        "technology",
        "science",
        "general",
        "health",
        "entertainment",
      ])
      .optional()
      .describe("News category filter"),
    language: z.string().optional().default("en"),
    limit: z.number().optional().default(10),
  }),
  outputSchema: z.object({
    articles: z.array(
      z.object({
        title: z.string(),
        link: z.string(),
        pubDate: z.string(),
        snippet: z.string(),
        source: z.string(),
      })
    ),
    error: z.string().optional(),
  }),
  execute: async ({ query, category, language = "en", limit = 10 }) => {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      return {
        articles: [],
        error: "NEWS_API_KEY not set. Skipping NewsAPI source.",
      };
    }

    try {
      const params = new URLSearchParams({
        q: query,
        language,
        pageSize: String(limit),
        sortBy: "relevancy",
        apiKey,
      });

      if (category) params.set("category", category);

      const response = await fetch(`${NEWSAPI_BASE}/everything?${params}`);
      const data = await response.json();

      if (data.status !== "ok") {
        return { articles: [], error: `NewsAPI error: ${data.message}` };
      }

      const articles = (data.articles || []).map((a: any) => ({
        title: a.title || "Untitled",
        link: a.url || "",
        pubDate: a.publishedAt || new Date().toISOString(),
        snippet: (a.description || "").slice(0, 300),
        source: a.source?.name || "NewsAPI",
      }));

      return { articles };
    } catch (err: any) {
      return { articles: [], error: `NewsAPI fetch failed: ${err.message}` };
    }
  },
});
