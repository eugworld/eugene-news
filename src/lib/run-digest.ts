/**
 * Manual trigger: npm run digest
 */
import "dotenv/config";

// Resolve path aliases for tsx runner
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic imports to work around path alias in tsx
async function main() {
  const { runDigestPipeline } = await import("./digest-pipeline.js");
  await runDigestPipeline();
}

main().catch(console.error);
