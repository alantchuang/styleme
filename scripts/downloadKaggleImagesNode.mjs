/**
 * Copies the 249 wardrobe seed images from the locally extracted Kaggle
 * small dataset into ~/Downloads/fashion-images/.
 *
 * Step 1 — download the small dataset (run once in Terminal 3):
 *   kaggle datasets download -d paramaggarwal/fashion-product-images-small \
 *     -p ~/Downloads/fashion-dataset --unzip
 *
 * Step 2 — copy the 249 images (run in Terminal 3):
 *   node scripts/downloadKaggleImagesNode.mjs
 *
 * After this, upload ~/Downloads/fashion-images/ through the app in batches of 20.
 */

import { readFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import path from "path";

const STYLES_CSV = path.join(process.cwd(), "docs", "styles.csv");
const SEED_FILE = path.join(process.cwd(), "convex", "seed.ts");
const OUT_DIR = path.join(process.env.HOME, "Downloads", "fashion-images");

// Where the small dataset extracts to
const IMAGES_DIR = path.join(
  process.env.HOME,
  "Downloads",
  "fashion-dataset",
  "fashion-dataset",
  "images"
);

// ---------------------------------------------------------------------------
// Parse styles.csv → Map<productDisplayName, id>
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Extract item names from seed.ts
// ---------------------------------------------------------------------------
const seedContent = readFileSync(SEED_FILE, "utf8");
const nameMatches = [...seedContent.matchAll(/\{ name: "([^"]+)"/g)];
const names = [...new Set(nameMatches.map((m) => m[1]))];

const items = [];
for (const name of names) {
  const id = nameToId.get(name);
  if (id) items.push({ name, id });
}

// ---------------------------------------------------------------------------
// Check dataset is present
// ---------------------------------------------------------------------------
if (!existsSync(IMAGES_DIR)) {
  console.error(`Dataset not found at: ${IMAGES_DIR}`);
  console.error("");
  console.error("Download it first (Terminal 3):");
  console.error(
    `  kaggle datasets download -d paramaggarwal/fashion-product-images-small \\`
  );
  console.error(`    -p ~/Downloads/fashion-dataset --unzip`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
console.log(`Copying ${items.length} images → ${OUT_DIR}\n`);

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------
let copied = 0;
let skipped = 0;
let missing = 0;

for (let i = 0; i < items.length; i++) {
  const { name, id } = items[i];
  const src = path.join(IMAGES_DIR, `${id}.jpg`);
  const dest = path.join(OUT_DIR, `${id}.jpg`);

  process.stdout.write(`  [${i + 1}/${items.length}] ${name} (${id}.jpg)… `);

  if (existsSync(dest)) {
    skipped++;
    console.log("already exists");
    continue;
  }

  if (!existsSync(src)) {
    missing++;
    console.log("not in dataset");
    continue;
  }

  copyFileSync(src, dest);
  copied++;
  console.log("✓");
}

console.log(
  `\nDone. ${copied} copied, ${skipped} already existed, ${missing} not in dataset.`
);
if (copied + skipped > 0) {
  console.log(`\nNext: open the app and upload from ${OUT_DIR} in batches of 20.`);
}
