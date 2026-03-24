import type { DailyDigest, SegmentStory } from "./types";

const IS_VERCEL = !!process.env.VERCEL;

// --- Vercel Blob helpers (using SDK put + direct URL reads) ---
async function blobPut(key: string, data: string): Promise<void> {
  const { put } = await import("@vercel/blob");
  // Use put which returns the URL — with addRandomSuffix: false for stable URLs
  const result = await put(key, data, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    allowOverwrite: true,
  });
  console.log(`  Blob PUT: ${key} → ${result.url}`);
}

async function blobGet(key: string): Promise<string | null> {
  // First try: use list to find the blob and get its URL
  try {
    const { list } = await import("@vercel/blob");
    const result = await list({ prefix: key, limit: 5 });
    const blob = result.blobs.find((b) => b.pathname === key);
    if (!blob) {
      console.log(`  Blob GET: ${key} not found in list`);
      return null;
    }
    console.log(`  Blob GET: ${key} found at ${blob.url.slice(0, 60)}... (${blob.size}b)`);
    // Fetch with no-store to bypass CDN cache
    const res = await fetch(blob.downloadUrl, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) {
      console.log(`  Blob fetch failed: ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.log(`  Blob GET error: ${(e as Error).message}`);
    return null;
  }
}

async function blobList(prefix: string): Promise<string[]> {
  try {
    const { list } = await import("@vercel/blob");
    const result = await list({ prefix, limit: 30 });
    return result.blobs.map((b) => b.pathname);
  } catch {
    return [];
  }
}

// --- Filesystem helpers (local dev) ---
async function fsPut(key: string, data: string): Promise<void> {
  const fs = await import("fs");
  const path = await import("path");
  const dir = path.join(process.cwd(), "src", "digests");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, key), data);
}

async function fsGet(key: string): Promise<string | null> {
  const fs = await import("fs");
  const path = await import("path");
  const filePath = path.join(process.cwd(), "src", "digests", key);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

async function fsList(prefix: string): Promise<string[]> {
  const fs = await import("fs");
  const path = await import("path");
  const dir = path.join(process.cwd(), "src", "digests");
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    return [];
  }
  return fs.readdirSync(dir).filter((f) => f.startsWith(prefix.replace("digests/", "")));
}

// --- Unified API ---
const storePut = IS_VERCEL ? blobPut : fsPut;
const storeGet = IS_VERCEL ? blobGet : fsGet;
const storeList = IS_VERCEL ? blobList : fsList;

export async function saveDigest(date: string, digest: DailyDigest): Promise<void> {
  const key = `digests/${date}.json`;
  console.log(`Saving digest: ${key} (${IS_VERCEL ? "Vercel Blob" : "filesystem"})`);
  try {
    const data = JSON.stringify(digest, null, 2);
    console.log(`  Data size: ${(data.length / 1024).toFixed(1)}KB, headline: ${digest.headline.slice(0, 40)}`);
    console.log(`  soWhat[0]: "${digest.segments[0]?.stories[0]?.soWhat?.slice(0, 50) || "EMPTY"}"`);
    await storePut(key, data);
    console.log(`  Save complete ✓`);
  } catch (e) {
    console.error("SAVE FAILED:", (e as Error).message);
    console.error("Stack:", (e as Error).stack?.slice(0, 300));
    throw e; // Re-throw so the caller knows it failed
  }
}

export async function getDigest(date: string): Promise<DailyDigest | null> {
  try {
    const data = await storeGet(`digests/${date}.json`);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    console.error("GET FAILED:", (e as Error).message);
    return null;
  }
}

export async function getLatestDigest(): Promise<DailyDigest | null> {
  try {
    const files = await storeList("digests/");
    const jsonFiles = files
      .map((f) => f.replace("digests/", "").replace(".json", ""))
      .filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f))
      .sort()
      .reverse();
    if (jsonFiles.length === 0) return null;
    return await getDigest(jsonFiles[0]);
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
  try {
    const files = await storeList("digests/");
    return files
      .map((f) => f.replace("digests/", "").replace(".json", ""))
      .filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
}
