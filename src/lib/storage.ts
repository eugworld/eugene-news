import type { DailyDigest, SegmentStory } from "./types";

// === VERCEL BLOB STORAGE (persistent across serverless invocations) ===
// Falls back to filesystem for local development

const IS_VERCEL = !!process.env.VERCEL;

// --- Vercel Blob helpers ---
async function blobPut(key: string, data: string): Promise<void> {
  const { put, del, list } = await import("@vercel/blob");

  // Delete existing blob first to ensure clean overwrite
  try {
    const existing = await list({ prefix: key, limit: 5 });
    const matches = existing.blobs.filter((b) => b.pathname === key);
    if (matches.length > 0) {
      await del(matches.map((b) => b.url));
      console.log(`  Deleted ${matches.length} existing blob(s) for ${key}`);
    }
  } catch (e) {
    console.log(`  Note: Could not delete existing blob: ${(e as Error).message}`);
  }

  // Write new blob
  const result = await put(key, data, { access: "public", addRandomSuffix: false });
  console.log(`  Saved blob: ${key} (${(data.length / 1024).toFixed(1)}KB) → ${result.url.slice(0, 60)}...`);
}

async function blobGet(key: string): Promise<string | null> {
  const { list } = await import("@vercel/blob");
  try {
    const result = await list({ prefix: key, limit: 5 });
    // Find exact match (not just prefix match)
    const blob = result.blobs.find((b) => b.pathname === key);
    if (!blob) return null;
    // Fetch with cache-busting
    const res = await fetch(blob.url + "?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.log(`  Blob get error for ${key}: ${(e as Error).message}`);
    return null;
  }
}

async function blobList(prefix: string): Promise<string[]> {
  const { list } = await import("@vercel/blob");
  try {
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
  console.log(`Saving digest to ${IS_VERCEL ? "Vercel Blob" : "filesystem"}: ${key}`);
  try {
    await storePut(key, JSON.stringify(digest, null, 2));
    console.log(`Digest saved successfully: ${date}`);
  } catch (e) {
    console.error("FAILED to save digest:", (e as Error).message, (e as Error).stack);
  }
}

export async function getDigest(date: string): Promise<DailyDigest | null> {
  try {
    const data = await storeGet(`digests/${date}.json`);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to get digest:", (e as Error).message);
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
