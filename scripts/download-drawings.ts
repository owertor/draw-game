/**
 * Run once: npm run prepare-data
 * Downloads ~40 recognized drawings per word from the QuickDraw dataset.
 * Streams each ndjson file and stops after collecting enough entries.
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { WORD_LIST } from "../lib/word-list";

const DRAWINGS_PER_WORD = 40;
const OUTPUT_DIR = join(process.cwd(), "public", "drawings");
const BASE_URL =
  "https://storage.googleapis.com/quickdraw_dataset/full/simplified";

interface NdjsonEntry {
  recognized: boolean;
  drawing: [number[], number[]][];
}

async function downloadWord(word: string): Promise<{ strokes: [number[], number[]][] }[]> {
  const url = `${BASE_URL}/${encodeURIComponent(word)}.ndjson`;
  console.log(`  Fetching ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for word "${word}"`);
  }
  if (!response.body) throw new Error("No response body");

  const results: { strokes: [number[], number[]][] }[] = [];
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (results.length < DRAWINGS_PER_WORD) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry: NdjsonEntry = JSON.parse(line);
          if (entry.recognized) {
            results.push({ strokes: entry.drawing });
            if (results.length >= DRAWINGS_PER_WORD) break;
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  } finally {
    await reader.cancel();
  }

  return results;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Downloading drawings to ${OUTPUT_DIR}\n`);

  for (const { en } of WORD_LIST) {
    process.stdout.write(`[${en}] `);
    try {
      const drawings = await downloadWord(en);
      const outPath = join(OUTPUT_DIR, `${en}.json`);
      await writeFile(outPath, JSON.stringify(drawings), "utf-8");
      console.log(`✓ ${drawings.length} drawings saved`);
    } catch (err) {
      console.error(`✗ failed: ${err}`);
    }
  }

  console.log("\nDone!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
