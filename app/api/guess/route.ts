import { NextRequest, NextResponse } from "next/server";
import { WORD_LIST } from "@/lib/word-list";

// Pre-built lookup for fast server-side matching
const VALID_WORDS_EN = WORD_LIST.map((w) => w.en);
// Compact word list string for the prompt (no spaces → fewer tokens)
const WORD_LIST_STR = VALID_WORDS_EN.join(",");

const GROQ_BODY = (imageBase64: string) => ({
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  messages: [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
        {
          type: "text",
          text: `You are judging a quick drawing game. The player had 30 seconds to sketch something.
Pick the TOP 3 best matching words from ONLY this list:
${WORD_LIST_STR}

Rules:
- Use ONLY words from the list above
- Order from most likely to least likely
- The drawing may be rough — focus on overall shape

Reply with ONLY a JSON array, example: ["bicycle","car","airplane"]`,
        },
      ],
    },
  ],
  max_tokens: 50,
  temperature: 0.1,
});

/** Levenshtein distance for fuzzy word matching */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

/**
 * Match a raw model word against our word list.
 * 1. Exact match
 * 2. Word list entry contains the raw word (or vice versa)
 * 3. Levenshtein distance ≤ 2
 */
function matchToWordList(raw: string): string | null {
  const r = raw.toLowerCase().trim();

  // 1. Exact
  if (VALID_WORDS_EN.includes(r)) return r;

  // 2. Substring / multi-word overlap
  for (const w of VALID_WORDS_EN) {
    if (w.includes(r) || r.includes(w)) return w;
  }

  // 3. Fuzzy (edit distance ≤ 2)
  for (const w of VALID_WORDS_EN) {
    if (levenshtein(r, w) <= 2) return w;
  }

  return null;
}

/** Single Groq request with one key. Returns the Response (may be 429). */
async function callGroqOnce(imageBase64: string, groqKey: string): Promise<Response> {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(GROQ_BODY(imageBase64)),
  });
}

/**
 * Try each key in order; on 429 immediately move to the next one.
 * GROQ_API_KEY can be a single key or comma-separated list: "key1,key2,key3"
 */
async function callGroq(imageBase64: string, keys: string[]): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let i = 0; i < keys.length; i++) {
    const response = await callGroqOnce(imageBase64, keys[i]);
    if (response.status !== 429) return response;
    lastResponse = response;
    console.log(`[/api/guess] key ${i + 1}/${keys.length} hit 429, trying next…`);
  }
  return lastResponse!;
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();
    if (!imageBase64) return NextResponse.json({ predictions: [] }, { status: 400 });

    const keys = (process.env.GROQ_API_KEY ?? "").split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      console.error("[/api/guess] GROQ_API_KEY is not set");
      return NextResponse.json({ predictions: [] }, { status: 500 });
    }

    const response = await callGroq(imageBase64, keys);

    if (!response.ok) {
      const errText = await response.text();
      console.error("[/api/guess] Groq error:", response.status, errText);
      return NextResponse.json({ predictions: [] }, { status: 500 });
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";

    const match = text.match(/\[[\s\S]*?\]/);
    const parsed: unknown[] = match ? JSON.parse(match[0]) : [];

    // Server-side fuzzy match against word list (no need to send the list to the model)
    const seen = new Set<string>();
    const predictions: string[] = [];
    for (const p of parsed) {
      if (typeof p !== "string") continue;
      const matched = matchToWordList(p);
      if (matched && !seen.has(matched)) {
        seen.add(matched);
        predictions.push(matched);
        if (predictions.length === 3) break;
      }
    }

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("[/api/guess]", error);
    return NextResponse.json({ predictions: [] }, { status: 500 });
  }
}
