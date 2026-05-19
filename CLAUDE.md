@AGENTS.md

# Draw & Guess vs Bot — project context for AI assistants

## What this is

A browser game built with Next.js 16 + TF.js + Canvas API. No backend, no paid APIs — fully static, deployable to Vercel free tier.

**Game loop (one round = two phases):**
- **Phase 1** — player draws a word on canvas → TF.js k-NN model tries to guess it in real-time. Points = `timeLeft × 5` (max 100, 20s timer).
- **Phase 2** — bot replays a QuickDraw stroke sequence on canvas → player types a fuzzy-matched guess. Points = 100 (guessed before bot finished) / 50 (guessed in the 10s window after).

## Stack

| Thing | Choice | Why |
|---|---|---|
| Framework | Next.js 16.2.6, App Router | installed by create-next-app |
| Language | TypeScript | |
| Styles | Tailwind CSS v4 (`@import "tailwindcss"`) | |
| ML | `@tensorflow/tfjs` | in-browser k-NN, no model URL needed |
| Fuzzy match | `fuse.js` | player's text answers |
| Sound | ZzFX inline (`lib/sounds.ts`) | no external dep |
| Storage | localStorage | best score, session stats |
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

No pre-trained model URL was found. Instead:

1. `initModel()` fetches all 30 `public/drawings/*.json` files, rasterizes 30 drawings per word to 28×28 canvas (black bg, white strokes), flattens to Float32Array.
2. Builds a gallery Tensor2D `[N, 784]` (N = words × 30 = 900 rows), L2-normalises rows.
3. `predict(canvas)` crops to ink bounding box → scales to 28×28 → inverts colours (dark→1) → L2-normalises → matMul with gallery → gets cosine similarities → mean-of-top-5 per word → min-max normalises to `[0, 1]` → returns top-5 predictions sorted by confidence.

Gallery stays in memory after first load. ModelLoader shows a progress bar during initModel.

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
| Phase 1: bot guessed | `timeLeft × 5` (max 100) |
| Phase 1: time ran out | 0 |
| Phase 2: guessed before bot finished drawing | 100 |
| Phase 2: guessed in 10s window after bot finished | 50 |
| Phase 2: time ran out | 0 |

Best score is persisted in localStorage via `lib/storage.ts`.

## Things that were tried and didn't work

- **canvasRef for prediction** — caused null reads after phase transitions. Use getElementById instead.
- **Raw cosine similarity scores (19–21%)** — gave indistinguishable results across all words. Fixed by: mean-of-top-5 aggregation per word + min-max normalisation to relative [0,1] range.
- **`heart` and `boat` word entries** — 404 from QuickDraw NDJSON URLs, replaced with `pizza` and `sailboat`.

## Deployment

Push to GitHub → connect to Vercel → deploy. No env vars needed. `public/drawings/` is committed, so prepare-data does not need to run on Vercel.
