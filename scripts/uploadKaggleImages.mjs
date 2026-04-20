/**
 * Downloads Kaggle fashion images and uploads them to Convex Storage.
 *
 * Usage:
 *   node scripts/uploadKaggleImages.mjs --clerkId <your-clerk-id>
 *
 * Prerequisites:
 *   - ~/.kaggle/kaggle.json must exist with valid credentials
 *   - npx convex dev must be running
 *   - NEXT_PUBLIC_CONVEX_URL must be in .env.local
 */

import { existsSync, readFileSync } from "fs";
import { readFile, mkdir } from "fs/promises";
import path from "path";
import { parseArgs } from "util";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const { values: args } = parseArgs({
  options: { clerkId: { type: "string" } },
});
if (!args.clerkId) {
  console.error("Usage: node scripts/uploadKaggleImages.mjs --clerkId <id>");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DATASET = "paramaggarwal/fashion-product-images-small";
const DOWNLOAD_DIR = path.join(process.cwd(), ".kaggle-cache");
const STYLES_CSV = path.join(process.cwd(), "docs", "styles.csv");
// Small dataset extracts to fashion-dataset/images/
const IMAGES_DIR = path.join(DOWNLOAD_DIR, "fashion-dataset", "images");

// Read Convex URL from .env.local
const envLocal = readFileSync(".env.local", "utf8");
const convexUrlMatch = envLocal.match(/NEXT_PUBLIC_CONVEX_URL=(.+)/);
if (!convexUrlMatch) {
  console.error("NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  process.exit(1);
}
const CONVEX_URL = convexUrlMatch[1].trim();

// ---------------------------------------------------------------------------
// Step 1: Parse styles.csv → Map<productDisplayName, id>
// ---------------------------------------------------------------------------
function parseStylesCsv() {
  const content = readFileSync(STYLES_CSV, "utf8").replace(/\r/g, "");
  const lines = content.split("\n");
  const header = lines[0].split(",");
  const idIdx = header.indexOf("id");
  const nameIdx = header.indexOf("productDisplayName");

  const nameToId = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < Math.max(idIdx, nameIdx) + 1) continue;
    const id = cols[idIdx]?.trim();
    const name = cols.slice(nameIdx).join(",").trim().replace(/^"|"$/g, "");
    if (id && name) nameToId.set(name, id);
  }
  return nameToId;
}

// ---------------------------------------------------------------------------
// Step 2: Look up image from locally extracted dataset
// Run this first to download the full dataset:
//   kaggle datasets download -d paramaggarwal/fashion-product-images-small \
//     -p /path/to/project/.kaggle-cache --unzip
// ---------------------------------------------------------------------------
async function downloadImage(kaggleId) {
  const imagePath = path.join(IMAGES_DIR, `${kaggleId}.jpg`);
  return existsSync(imagePath) ? imagePath : null;
}

// ---------------------------------------------------------------------------
// Step 3: Call Convex mutation via HTTP API
// ---------------------------------------------------------------------------
async function callMutation(name, args) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: name, args }),
  });
  const json = await res.json();
  if (!res.ok || json.status === "error") {
    throw new Error(`Mutation ${name} failed: ${json.errorMessage ?? res.status}`);
  }
  return json.value;
}

// ---------------------------------------------------------------------------
// Step 4: Upload one image to Convex Storage
// ---------------------------------------------------------------------------
async function uploadImage(imagePath) {
  const uploadUrl = await callMutation("seed:generateUploadUrl", {});
  const imageBuffer = await readFile(imagePath);
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: imageBuffer,
  });
  if (!res.ok) throw new Error(`Storage upload failed: ${res.status}`);
  const { storageId } = await res.json();
  return storageId;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("📖 Parsing docs/styles.csv…");
  const nameToId = parseStylesCsv();
  console.log(`   ${nameToId.size} products indexed.`);

  console.log("📋 Fetching wardrobe items from Convex…");
  const items = await callMutation("seed:listItemsForUpload", { clerkId: args.clerkId });
  console.log(`   ${items.length} items to process.`);
  if (items.length > 0) {
    const first = items[0];
    const match = nameToId.get(first.name);
    console.log(`   Sample: "${first.name}" → kaggle ID: ${match ?? "NO MATCH"}\n`);
  }

  let uploaded = 0;
  let skipped = 0;

  for (const item of items) {
    const kaggleId = nameToId.get(item.name);
    if (!kaggleId) {
      console.log(`  ⚠ No match for: "${item.name}"`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`  ⬇ [${uploaded + skipped + 1}/${items.length}] ${item.name}… `);
      const imagePath = await downloadImage(kaggleId);
      if (!imagePath) {
        console.log("not in dataset");
        skipped++;
        continue;
      }

      const storageId = await uploadImage(imagePath);
      const imageUrl = `${CONVEX_URL}/api/storage/${storageId}`;
      await callMutation("seed:patchImageUrl", { itemId: item._id, storageId, imageUrl });

      uploaded++;
      console.log("✓");
    } catch (err) {
      console.log(`✗ ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n✅ Done. ${uploaded} uploaded, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
