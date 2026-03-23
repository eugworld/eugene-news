import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "NewsAgent/1.0",
  },
});

export const fetchRssTool = createTool({
  id: "fetch-rss",
  description:
    "Fetch and parse articles from an RSS feed. Returns the latest articles with title, link, date, and snippet.",
  inputSchema: z.object({
    feedUrl: z.string().url().describe("The RSS feed URL to fetch"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Max number of articles to return"),
    source: z
      .string()
      .describe("Human-readable name of this source (e.g. 'TechCrunch')"),
  }),
  outputSchema: z.object({
    source: z.string(),
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
  execute: async ({ feedUrl, limit = 10, source }) => {
    try {
      const feed = await parser.parseURL(feedUrl);
      const articles = (feed.items || []).slice(0, limit).map((item) => ({
        title: item.title || "Untitled",
        link: item.link || "",
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        snippet: stripHtml(item.contentSnippet || item.content || "").slice(
          0,
          300
        ),
        source,
      }));

      return { source, articles };
    } catch (err: any) {
      return {
        source,
        articles: [],
        error: `Failed to fetch ${source}: ${err.message}`,
      };
    }
  },
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
