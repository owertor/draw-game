import Fuse from "fuse.js";
import { WORD_LIST } from "./word-list";

// Build a flat list of all valid answers per word: {answer, wordEn}
const entries = WORD_LIST.flatMap((w) =>
  w.synonyms.map((syn) => ({ answer: syn.toLowerCase(), wordEn: w.en }))
);

const fuse = new Fuse(entries, {
  keys: ["answer"],
  threshold: 0.35, // 0=exact, 1=match anything
  includeScore: true,
  minMatchCharLength: 2,
});

export function checkAnswer(userInput: string, correctWordEn: string): boolean {
  const input = userInput.trim().toLowerCase();
  if (!input) return false;
  const results = fuse.search(input);
  if (results.length === 0) return false;
  // The best match must point to the correct word
  return results[0].item.wordEn === correctWordEn;
}
