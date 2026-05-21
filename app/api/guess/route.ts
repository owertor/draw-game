import { NextRequest, NextResponse } from "next/server";
import { WORD_LIST } from "@/lib/word-list";

const WORD_LIST_STR = WORD_LIST.map((w) => w.en).join(", ");
const VALID_WORDS   = new Set(WORD_LIST.map((w) => w.en));

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const GROQ_BODY = (imageBase64: string) => ({
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  messages: [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
        {
          type: "text",
          text: `You are judging a quick drawing game. The player had 20 seconds to sketch something.
Look at the sketch and identify what it depicts.

Pick the TOP 3 best matching words from ONLY this list:
${WORD_LIST_STR}

Rules:
- Use ONLY words from the list above
- Order from most likely to least likely
- The drawing may be rough — focus on overall shape and key features

Reply with ONLY a JSON array, example: ["bicycle", "car", "airplane"]`,
        },
      ],
    },
  ],
  max_tokens: 60,
  temperature: 0.1,
});

/** Calls Groq with automatic retry on 429 rate-limit. */
async function callGroq(
  imageBase64: string,
  groqKey: string,
  maxRetries = 1
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(GROQ_BODY(imageBase64)),
    });

    if (response.status !== 429) return response;

    lastResponse = response;

    if (attempt < maxRetries) {
      // Parse "Please try again in X.XXXs" from Groq error body
      const errText = await response.text();
      const match   = errText.match(/try again in ([\d.]+)s/);
      const waitMs  = match ? Math.ceil(parseFloat(match[1]) * 1000) + 300 : 3500;
      console.log(`[/api/guess] 429 — retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(waitMs);
    }
  }

  return lastResponse!;
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();
    if (!imageBase64) return NextResponse.json({ predictions: [] }, { status: 400 });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      console.error("[/api/guess] GROQ_API_KEY is not set");
      return NextResponse.json({ predictions: [] }, { status: 500 });
    }

    const response = await callGroq(imageBase64, groqKey);

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
    const raw: unknown[] = match ? JSON.parse(match[0]) : [];

    const predictions = raw
      .filter((p): p is string => typeof p === "string" && VALID_WORDS.has(p))
      .slice(0, 3);

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("[/api/guess]", error);
    return NextResponse.json({ predictions: [] }, { status: 500 });
  }
}
