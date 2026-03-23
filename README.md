# News Agent — AI-Powered Daily Brief with Advisor Lenses

A personal AI news intelligence agent built with **Mastra AI**. It doesn't just summarize news — it analyzes every story through your board of advisors' perspectives so you wake up knowing what matters and why.

## What It Does

Every morning, the agent:

1. **Fetches** news from Hacker News, TechCrunch, The Verge, a16z, NewsAPI, and more
2. **Deduplicates** and ranks stories by relevance to your interests
3. **Analyzes** each story through advisor lenses (Tech Expert, CEO Advisor, PM Expert, etc.)
4. **Composes** a scannable HTML email with: The Big Story, Quick Hits, Signals & Patterns, Action Items, and a Skip Pile
5. **Delivers** via email (Resend) — extensible to Slack, web UI, Telegram

## Quick Start

```bash
# Clone and install
cd news-agent-mastra
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys (see below)

# Test the fetch tools work
npm test

# Run a full digest (manual trigger)
npm run digest

# Start the Mastra dev server (with scheduled execution)
npm run dev
```

## Required API Keys

| Service | Get It | Free Tier |
|---------|--------|-----------|
| **Anthropic** (Claude) | [console.anthropic.com](https://console.anthropic.com) | Pay-per-use (~$3-5/mo) |
| **Resend** (email) | [resend.com](https://resend.com) | 100 emails/day |

## Optional API Keys

| Service | Get It | Free Tier |
|---------|--------|-----------|
| NewsAPI | [newsapi.org](https://newsapi.org) | 100 requests/day |
| Firecrawl | [firecrawl.dev](https://firecrawl.dev) | 500 pages/mo |

## Project Structure

```
src/mastra/
├── agents/
│   ├── news-analyst.ts      # Applies advisor lenses to stories
│   └── digest-composer.ts   # Composes the HTML email
├── tools/
│   ├── fetch-rss.ts         # RSS feed parser
│   ├── fetch-hackernews.ts  # HN Algolia API
│   ├── fetch-newsapi.ts     # NewsAPI.org
│   └── send-email.ts        # Resend email delivery
├── workflows/
│   └── daily-digest.ts      # The 5-step pipeline
└── index.ts                 # Mastra entry point
```

## The Advisor Lens System

What makes this different: each story gets a "So What" from the relevant advisor.

| Advisor | Covers | Asks |
|---------|--------|------|
| **Tech Expert** | AI/ML, frameworks, tools | "How does this change what I build?" |
| **CEO Advisor** | Funding, market moves, macro | "What does this signal for my business?" |
| **PM Expert** | Product launches, UX shifts | "What product thinking can I steal?" |
| **Career Expert** | Hiring, layoffs, market shifts | "How does this change my positioning?" |
| **Marketing Expert** | Growth, distribution, viral | "What tactic can I apply?" |
| **Design Expert** | UX, design systems | "What pattern should I notice?" |
| **Devil's Advocate** | Overhyped narratives | "What's everyone getting wrong?" |

## Customization

**Change your news sources:** Edit the `rssFeeds` array and `newsQueries` in `src/mastra/workflows/daily-digest.ts`

**Change advisor behavior:** Edit the system prompt in `src/mastra/agents/news-analyst.ts`

**Change email design:** Edit the composer prompt in `src/mastra/agents/digest-composer.ts`

**Add delivery channels:** Add a new step after `deliverDigest` in the workflow

## Estimated Cost

~$3-5/month total. Claude Haiku handles individual story analysis (fast, cheap). Sonnet handles Board Briefings and pattern detection.

## Part of Board of Advisors

This news agent is a companion project to the [Board of Advisors](https://github.com/eugworld/board-of-advisors) skill system. The advisor lenses used here mirror the same advisor personas.

## License

MIT
