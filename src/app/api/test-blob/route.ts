import { NextResponse } from "next/server";

export async function GET() {
  const results: string[] = [];

  try {
    results.push(`VERCEL: ${!!process.env.VERCEL}`);
    results.push(`BLOB_TOKEN: ${process.env.BLOB_READ_WRITE_TOKEN ? 'SET (' + process.env.BLOB_READ_WRITE_TOKEN.slice(0, 20) + '...)' : 'NOT SET'}`);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // List all env vars that contain BLOB
      const blobVars = Object.keys(process.env).filter(k => k.includes('BLOB'));
      results.push(`Blob-related env vars: ${blobVars.join(', ') || 'NONE'}`);
      return NextResponse.json({ results, error: "No BLOB_READ_WRITE_TOKEN" });
    }

    const { put, list, del } = await import("@vercel/blob");

    // Write test
    const testData = JSON.stringify({ test: true, timestamp: new Date().toISOString() });
    results.push(`Writing test blob...`);
    const putResult = await put("test/hello.json", testData, { access: "public", addRandomSuffix: false });
    results.push(`Put result: ${putResult.url}`);

    // List
    const listResult = await list({ prefix: "test/", limit: 5 });
    results.push(`List result: ${listResult.blobs.length} blobs`);
    for (const b of listResult.blobs) {
      results.push(`  - ${b.pathname} → ${b.url.slice(0, 60)}...`);
    }

    // Also list digests
    const digestList = await list({ prefix: "digests/", limit: 10 });
    results.push(`Digest blobs: ${digestList.blobs.length}`);
    for (const b of digestList.blobs) {
      results.push(`  - ${b.pathname} (${b.size} bytes, uploaded ${b.uploadedAt})`);
    }

    // Read
    const readRes = await fetch(putResult.url + "?t=" + Date.now(), { cache: "no-store" });
    const readData = await readRes.text();
    results.push(`Read result: ${readData}`);

    // Cleanup
    await del(putResult.url);
    results.push(`Deleted test blob`);

    return NextResponse.json({ results });
  } catch (error: any) {
    results.push(`ERROR: ${error.message}`);
    results.push(`Stack: ${error.stack?.slice(0, 300)}`);
    return NextResponse.json({ results, error: error.message }, { status: 500 });
  }
}
