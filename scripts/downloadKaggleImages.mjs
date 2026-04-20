/**
 * Prints kaggle CLI commands to download the 250 wardrobe seed images.
 * Reads item names directly from convex/seed.ts — no Convex connection needed.
 *
 * Usage (Terminal 3):
 *   node scripts/downloadKaggleImages.mjs | bash
 *
 * Preview without downloading:
 *   node scripts/downloadKaggleImages.mjs
 */

import { readFileSync } from "fs";
import path from "path";

const STYLES_CSV = path.join(process.cwd(), "docs", "styles.csv");
const SEED_FILE = path.join(process.cwd(), "convex", "seed.ts");
const OUT_DIR = path.join(process.env.HOME, "Downloads", "fashion-images");

// Parse styles.csv → Map<productDisplayName, id>
const csv = readFileSync(STYLES_CSV, "utf8").replace(/\r/g, "");
const lines = csv.split("\n");
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

// Extract item names from seed.ts by matching: name: "..."
const seedContent = readFileSync(SEED_FILE, "utf8");
const nameMatches = [...seedContent.matchAll(/\{ name: "([^"]+)"/g)];
const names = [...new Set(nameMatches.map((m) => m[1]))];

// Print commands
console.log(`mkdir -p "${OUT_DIR}"`);
let matched = 0;
let unmatched = 0;
for (const name of names) {
  const id = nameToId.get(name);
  if (!id) { unmatched++; continue; }
  console.log(`kaggle datasets download -d paramaggarwal/fashion-product-images-dataset -f images/${id}.jpg -p "${OUT_DIR}" --unzip`);
  matched++;
}
process.stderr.write(`# ${matched} matched, ${unmatched} unmatched (of ${names.length} total)\n`);
