import * as fs from "fs";
import * as path from "path";

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

function readContent(filename: string): string {
  const filePath = path.join(CONTENT_DIR, filename);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8");
}

function condenseMd(content: string, maxLines: number = 120): string {
  return content.split("\n").slice(0, maxLines).join("\n");
}

export function getPersona(): string {
  return readContent("persona.md");
}

export function getChallengeProtocol(): string {
  return condenseMd(readContent("challenge-protocol.md"), 100);
}

export function getAdvisorContent(advisor: string): string {
  const fileMap: Record<string, string> = {
    "Tech Expert": "tech-expert.md",
    "CEO Advisor": "ceo-advisor.md",
    "PM Expert": "pm-expert.md",
    "Career Expert": "career-expert.md",
    "Marketing Expert": "marketing-expert.md",
    "Design Expert": "design-expert.md",
    "Devil's Advocate": "devils-advocate.md",
  };
  const filename = fileMap[advisor];
  if (!filename) return "";
  return condenseMd(readContent(filename), 120);
}

export function getAllAdvisorSummaries(): string {
  const advisors = [
    { name: "Tech Expert", lens: "How does this change what I should build or how I build it?", color: "blue" },
    { name: "CEO Advisor", lens: "What does this signal about market direction and my business?", color: "purple" },
    { name: "PM Expert", lens: "What product thinking can I steal? What user behavior does this reveal?", color: "green" },
    { name: "Career Expert", lens: "How does this change career positioning or hiring strategy?", color: "orange" },
    { name: "Marketing Expert", lens: "What distribution insight or tactic can I apply?", color: "pink" },
    { name: "Design Expert", lens: "What design pattern or principle should I pay attention to?", color: "teal" },
    { name: "Devil's Advocate", lens: "What's the counter-argument nobody's making? What's overhyped?", color: "red" },
  ];

  return advisors
    .map((a) => `**${a.name}** (${a.color}): "${a.lens}"`)
    .join("\n");
}
