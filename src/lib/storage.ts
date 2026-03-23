import * as fs from "fs";
import * as path from "path";
import type { DailyDigest, SegmentStory } from "./types";

// On Vercel, use /tmp for writable storage. Locally, use src/digests.
const DIGESTS_DIR = process.env.VERCEL
  ? path.join("/tmp", "digests")
  : path.join(process.cwd(), "src", "digests");

function ensureDir() {
  try {
    if (!fs.existsSync(DIGESTS_DIR)) fs.mkdirSync(DIGESTS_DIR, { recursive: true });
  } catch {}
}

export async function saveDigest(date: string, digest: DailyDigest): Promise<void> {
  ensureDir();
  try {
    fs.writeFileSync(path.join(DIGESTS_DIR, `${date}.json`), JSON.stringify(digest, null, 2));
  } catch (e) {
    console.log("Failed to save digest to filesystem:", (e as Error).message);
  }
}

export async function getDigest(date: string): Promise<DailyDigest | null> {
  try {
    const filePath = path.join(DIGESTS_DIR, `${date}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export async function getLatestDigest(): Promise<DailyDigest | null> {
  ensureDir();
  try {
    const files = fs.readdirSync(DIGESTS_DIR).filter((f) => f.endsWith(".json")).sort().reverse();
    if (files.length === 0) return null;
    return JSON.parse(fs.readFileSync(path.join(DIGESTS_DIR, files[0]), "utf-8"));
  } catch {
    return null;
  }
}

export async function getStory(date: string, slug: string): Promise<SegmentStory | null> {
  const digest = await getDigest(date);
  if (!digest) return null;
  for (const seg of digest.segments) {
    const found = seg.stories.find((s) => s.id === slug);
    if (found) return found;
  }
  return null;
}

export async function listDigestDates(): Promise<string[]> {
  ensureDir();
  try {
    return fs.readdirSync(DIGESTS_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", "")).sort().reverse();
  } catch {
    return [];
  }
}

export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
}
