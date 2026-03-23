// === SEGMENT-BASED NEWS INTELLIGENCE ===

export const SEGMENTS = [
  { name: "Tech + AI", icon: "🤖", advisorLens: "Tech Expert" },
  { name: "Startup World", icon: "💰", advisorLens: "CEO Advisor" },
  { name: "Macro & Geopolitics", icon: "🌍", advisorLens: "CEO Advisor" },
  { name: "Indonesia & SEA", icon: "🇮🇩", advisorLens: "PM Expert" },
] as const;

export type SegmentName = (typeof SEGMENTS)[number]["name"];

export interface AdvisorPerspective {
  advisor: string;
  soWhat: string;
  actionItem: string | null;
  relevanceScore: number;
  challenge: string | null;
}

export interface SegmentStory {
  id: string;
  title: string;
  link: string;
  source: string;
  pubDate: string;
  tldr: string;
  soWhat: string;
  problem: string;
  opportunity: string | null;
  advisorLens: string;
  relevanceScore: number;
  perspectives: AdvisorPerspective[];
}

export interface Segment {
  name: SegmentName;
  icon: string;
  stories: SegmentStory[];
  tldr: string;
  advisorLens: string;
}

export interface Correlation {
  segmentA: string;
  segmentB: string;
  connection: string;
  implication: string;
  confidence: "high" | "medium" | "speculative";
}

export interface DailyDigest {
  date: string;
  generatedAt: string;
  headline: string;
  segments: Segment[];
  correlations: Correlation[];
  actionItems: string[];
  metadata: {
    totalFetched: number;
    afterDedup: number;
    analyzed: number;
    fetchErrors: string[];
  };
}

export interface RawArticle {
  title: string;
  link: string;
  pubDate: string;
  snippet: string;
  source: string;
  points?: number;
  comments?: number;
  segment?: SegmentName;
}

export const ADVISORS = [
  "Tech Expert", "CEO Advisor", "PM Expert", "Career Expert",
  "Marketing Expert", "Design Expert", "Devil's Advocate",
] as const;

export type AdvisorName = (typeof ADVISORS)[number];

export const ADVISOR_COLORS: Record<string, string> = {
  "Tech Expert": "#3B82F6",
  "CEO Advisor": "#8B5CF6",
  "PM Expert": "#10B981",
  "Career Expert": "#F59E0B",
  "Marketing Expert": "#EC4899",
  "Design Expert": "#14B8A6",
  "Devil's Advocate": "#EF4444",
};

export const SEGMENT_COLORS: Record<string, string> = {
  "Tech + AI": "#3B82F6",
  "Startup World": "#8B5CF6",
  "Macro & Geopolitics": "#F59E0B",
  "Indonesia & SEA": "#EF4444",
};
