import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const HN_API = "https://hn.algolia.com/api/v1";

export const fetchHackerNewsTool = createTool({
  id: "fetch-hackernews",
  description:
    "Fetch top stories from Hacker News using the Algolia API. Returns high-signal tech/AI stories.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .default("")
      .describe("Optional search query to filter stories (e.g. 'AI agent')"),
    limit: z.number().optional().default(15),
    hoursBack: z
      .number()
      .optional()
      .default(24)
      .describe("How many hours back to search"),
  }),
  outputSchema: z.object({
    articles: z.array(
      z.object({
        title: z.string(),
        link: z.string(),
        pubDate: z.string(),
        snippet: z.string(),
        source: z.string(),
        points: z.number(),
        comments: z.number(),
      })
    ),
    error: z.string().optional(),
  }),
  execute: async ({ query, limit = 15, hoursBack = 24 }) => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const since = now - hoursBack * 3600;

      const endpoint = query
        ? `${HN_API}/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i>${since}&hitsPerPage=${limit}`
        : `${HN_API}/search?tags=front_page&numericFilters=created_at_i>${since}&hitsPerPage=${limit}`;

      const response = await fetch(endpoint);
      const data = await response.json();

      const articles = (data.hits || [])
        .sort((a: any, b: any) => (b.points || 0) - (a.points || 0))
        .slice(0, limit)
        .map((hit: any) => ({
          title: hit.title || "Untitled",
          link: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          pubDate: hit.created_at || new Date().toISOString(),
          snippet: hit.story_text
            ? hit.story_text.replace(/<[^>]*>/g, "").slice(0, 300)
            : `${hit.points || 0} points, ${hit.num_comments || 0} comments on HN`,
          source: "Hacker News",
          points: hit.points || 0,
          comments: hit.num_comments || 0,
        }));

      return { articles };
    } catch (err: any) {
      return { articles: [], error: `HN fetch failed: ${err.message}` };
    }
  },
});
