@AGENTS.md

# Draw & Guess vs Bot — project context for AI assistants

## What this is

A browser game built with Next.js 16 + Canvas API. Drawing recognition runs on a server-side vision model (Groq Llama-4-Scout via `/api/guess`); accounts, scores, leaderboard and achievements are backed by Supabase. Deployable to Vercel.

**Game loop (one round = two phases):**
- **Phase 1** — player draws a word on canvas → the vision model tries to guess it. Points = `timeLeft × 5` (max 150, 30s timer).
- **Phase 2** — bot replays a QuickDraw stroke sequence on canvas → player types a fuzzy-matched guess. Points = `timeLeft × 5` (max 150, 30s timer; guess early for more).

## Stack

| Thing | Choice | Why |
|---|---|---|
| Framework | Next.js 16.2.6, App Router | installed by create-next-app |
| Language | TypeScript | |
| Styles | Tailwind CSS v4 (`@import "tailwindcss"`) | |
| ML | Server-side vision (Groq Llama-4-Scout) | called from `/api/guess`; key in `GROQ_API_KEY` |
| Backend | Supabase (auth + Postgres) | profiles, scores, daily, achievements |
| Fuzzy match | custom synonym map + server-side Levenshtein | player answers / model output |
| Sound | ZzFX inline (`lib/sounds.ts`) | no external dep |
| Storage | localStorage + Supabase | local best/session; cloud stats when logged in |
| Dataset | QuickDraw NDJSON (pre-downloaded) | `public/drawings/*.json` |

## Key files

```
app/
  page.tsx          # main menu
  game/page.tsx     # full game loop — the most complex file
  globals.css       # dark theme vars + CSS animations (slideIn, pop, shake, fadeIn)
  layout.tsx        # title, viewport meta (viewport-fit=cover for iOS)

components/
  DrawingCanvas.tsx # canvas with mouse+touch, quadraticCurveTo smoothing
  BotCanvas.tsx     # replays QuickDraw strokes via requestAnimationFrame
  ModelLoader.tsx   # fullscreen overlay while initModel() runs
  Timer.tsx         # progress bar, red+pulse at ≤5s
  GuessInput.tsx    # auto-focus input, green on correct
  ScoreBoard.tsx    # round / total / best scores header
  GameOver.tsx      # round results + "Next round" button

lib/
  quickdraw-model.ts  # k-NN: gallery Tensor2D [N×784], cosine sim via matMul
  word-list.ts        # 30 words {en, ru, synonyms}
  fuzzy-match.ts      # Fuse.js wrapper, threshold 0.35
  drawings-loader.ts  # fetch /drawings/{word}.json, pick random entry
  sounds.ts           # ZzFX inline: Sounds.correct / tick / fail / start
  storage.ts          # getBestScore / saveGameResult

public/drawings/      # 30 JSON files, 40 drawings each (~15 KB/file)
scripts/
  download-drawings.ts  # run once: npm run prepare-data
```

## How to run

```bash
npm install
npm run prepare-data   # only needed if public/drawings/ is missing
npm run dev
```

Game is at `http://localhost:3000/game`.

## Architecture: the ML model

Recognition is server-side, not local TF.js (an earlier k-NN approach was replaced):

1. `predict(canvas)` in `lib/quickdraw-model.ts` downsizes the canvas to a small PNG and POSTs base64 to `/api/guess`.
2. `app/api/guess/route.ts` sends the image + the word list to the Groq vision model, parses the JSON array it returns, and fuzzy-matches each raw word back to the canonical list (`matchToWordList`: exact → ≥4-char substring → Levenshtein ≤ 1–2).
3. The route is rate-limited (30 req/min/IP) and caps the payload size; `GROQ_API_KEY` may be a comma-separated list of keys (rotated on 429).

`predict()` returns top-3 with **display-only** confidence values (100/70/40%) — these are rank placeholders, not real probabilities. `initModel()` is now a no-op kept for the ModelLoader contract.

## Architecture: stale-closure trap

All setInterval timers close over state. Every mutable value read inside a timer uses a ref:

| Ref | State it mirrors |
|---|---|
| `p1SuccessRef` | `p1Success` |
| `p2GuessCorrectRef` | `p2GuessCorrect` |
| `p2BotDoneRef` | `p2BotDone` |
| `phaseRef` | `phase` |
| `modelReadyRef` | `modelReady` |

When changing game logic that involves timers, update both the state setter AND the matching ref.

## Architecture: canvas ID

`DrawingCanvas` accepts a `canvasId` prop (set to `"game-canvas"`). The predict function finds it via `document.getElementById("game-canvas")` — not a ref — because refs were unreliable across phase transitions during development.

## Word list

30 words in `lib/word-list.ts`. Each entry: `{ en: string, ru: string, synonyms: string[] }`. The `en` value must match a filename in `public/drawings/` exactly. If you add/remove words, re-run `npm run prepare-data`.

Known replacements from the original QuickDraw fetch (404 words removed):
- `heart` → `pizza`
- `boat` → `sailboat`

## CSS animations

Defined in `app/globals.css`:
- `.phase-enter` — slide-in from below (applied to every phase panel in game/page.tsx)
- `.pop` — scale bounce (correct answer)
- `.shake` — horizontal shake (wrong answer)
- `.fade-in` — opacity fade

## Sound events

| Event | Sound |
|---|---|
| Round starts | `Sounds.start()` |
| Bot/player guesses correctly | `Sounds.correct()` |
| Phase 1 timer ≤ 5s (each tick) | `Sounds.tick()` |
| Round ends with 0 total points | `Sounds.fail()` |

## Scoring

| Situation | Points |
|---|---|
| Phase 1: bot guessed | `timeLeft × 5` (max 150, 30s timer) |
| Phase 1: time ran out | 0 |
| Phase 2: player guessed | `timeLeft × 5` (max 150, 30s timer — guess early for more) |
| Phase 2: time ran out | 0 |

Best score is persisted in localStorage via `lib/storage.ts`, and—when logged in—mirrored to Supabase `profiles`/`game_results`. Score writes are client-trusted (RLS only checks ownership), so the leaderboard is not cheat-proof; treat it as cosmetic.

## Things that were tried and didn't work

- **canvasRef for prediction** — caused null reads after phase transitions. Use getElementById instead.
- **Raw cosine similarity scores (19–21%)** — gave indistinguishable results across all words. Fixed by: mean-of-top-5 aggregation per word + min-max normalisation to relative [0,1] range.
- **`heart` and `boat` word entries** — 404 from QuickDraw NDJSON URLs, replaced with `pizza` and `sailboat`.

## Deployment

Push to GitHub → connect to Vercel → deploy. Required env vars: `GROQ_API_KEY` (one or comma-separated), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Run `supabase-schema.sql` in the Supabase SQL editor once. `public/drawings/` is committed, so prepare-data does not need to run on Vercel.
