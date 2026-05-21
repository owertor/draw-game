import { WORD_LIST } from "./word-list";

// Normalize: lowercase + ё→е
// (на многих клавиатурах нет буквы ё — принимаем оба варианта)
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/ё/g, "е");
}

// Precompute: wordEn → Set of valid answers (all synonyms, normalized)
const answerMap = new Map<string, Set<string>>();
for (const word of WORD_LIST) {
  answerMap.set(word.en, new Set(word.synonyms.map(normalize)));
}

export function checkAnswer(userInput: string, correctWordEn: string): boolean {
  const input = normalize(userInput);
  if (!input) return false;
  return answerMap.get(correctWordEn)?.has(input) ?? false;
}
