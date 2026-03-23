import { Mastra } from "@mastra/core";
import { newsAnalyst } from "./agents/news-analyst";
import { digestComposer } from "./agents/digest-composer";
import { chatAdvisor } from "./agents/chat-advisor";
import { fetchRssTool } from "./tools/fetch-rss";
import { fetchHackerNewsTool } from "./tools/fetch-hackernews";
import { fetchNewsApiTool } from "./tools/fetch-newsapi";
import { sendEmailTool } from "./tools/send-email";

export const mastra = new Mastra({
  agents: {
    "news-analyst": newsAnalyst,
    "digest-composer": digestComposer,
    "chat-advisor": chatAdvisor,
  },
  tools: {
    "fetch-rss": fetchRssTool,
    "fetch-hackernews": fetchHackerNewsTool,
    "fetch-newsapi": fetchNewsApiTool,
    "send-email": sendEmailTool,
  },
});
