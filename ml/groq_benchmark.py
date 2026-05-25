"""
Benchmark the Groq vision model on the SAME held-out test images the CNN saw.

For fairness we give Groq the same 50-class candidate list the CNN chooses from
(not the full 321-word game list). Each 28x28 QuickDraw bitmap is inverted to
black-strokes-on-white and upscaled to ~200px — matching what the real game
canvas sends to /api/guess.

Writes ml/results_groq.json
"""
import base64
import io
import json
import os
import random
import re
import time
import numpy as np
import requests
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
PER_CLASS = 2            # ~100 images total across 50 classes (free-tier friendly)
IMG_SIZE = 200

with open(os.path.join(HERE, "classes.json"), encoding="utf-8") as f:
    CLASSES = json.load(f)


def load_keys() -> list[str]:
    env = os.path.join(HERE, "..", ".env.local")
    keys = []
    with open(env, encoding="utf-8") as f:
        for line in f:
            if line.startswith("GROQ_API_KEY="):
                raw = line.split("=", 1)[1].strip()
                keys = [k.strip() for k in raw.split(",") if k.strip()]
    if not keys:
        raise SystemExit("No GROQ_API_KEY in .env.local")
    return keys


def levenshtein(a: str, b: str) -> int:
    m, n = len(a), len(b)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev, dp[0] = dp[0], i
        for j in range(1, n + 1):
            cur = dp[j]
            dp[j] = min(dp[j] + 1, dp[j-1] + 1, prev + (a[i-1] != b[j-1]))
            prev = cur
    return dp[n]


def match_to_list(raw: str):
    r = raw.lower().strip()
    if len(r) < 3:
        return None
    if r in CLASSES:
        return r
    for w in CLASSES:
        if min(len(w), len(r)) >= 4 and (w in r or r in w):
            return w
    for w in CLASSES:
        if levenshtein(r, w) <= (1 if len(w) <= 4 else 2):
            return w
    return None


def to_png_b64(bitmap_784: np.ndarray) -> str:
    img = bitmap_784.reshape(28, 28).astype(np.uint8)
    img = 255 - img  # invert -> black strokes on white, like the game canvas
    pil = Image.fromarray(img, "L").resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def build_body(b64: str):
    word_list_str = ",".join(CLASSES)
    return {
        "model": MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                {"type": "text", "text": (
                    "You are judging a quick drawing game. The player had 30 seconds to sketch something.\n"
                    "Pick the TOP 3 best matching words from ONLY this list:\n" + word_list_str + "\n\n"
                    "Rules:\n- Use ONLY words from the list above\n"
                    "- Order from most likely to least likely\n"
                    "- The drawing may be rough — focus on overall shape\n\n"
                    'Reply with ONLY a JSON array, example: ["bicycle","car","airplane"]')},
            ],
        }],
        "max_tokens": 50,
        "temperature": 0.1,
    }


def call_groq(b64: str, keys: list[str]):
    """Returns (top3_matched:list[str], latency_ms:float) or (None, latency)."""
    body = build_body(b64)
    for attempt in range(10):
        key = keys[attempt % len(keys)]
        t0 = time.perf_counter()
        try:
            r = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json=body, timeout=60,
            )
        except Exception as e:
            print("  net error:", e, flush=True)
            time.sleep(3)
            continue
        lat = (time.perf_counter() - t0) * 1000
        if r.status_code == 429:
            wait = min(40, 8 * (attempt + 1))
            print(f"  429, backoff {wait}s", flush=True)
            time.sleep(wait)
            continue
        if not r.ok:
            print("  err", r.status_code, r.text[:120], flush=True)
            time.sleep(3)
            continue
        text = r.json()["choices"][0]["message"]["content"].strip()
        m = re.search(r"\[[\s\S]*?\]", text)
        try:
            parsed = json.loads(m.group(0)) if m else []
        except (json.JSONDecodeError, ValueError):
            # model returned malformed JSON — salvage quoted words
            parsed = re.findall(r'"([^"]+)"', text)
        out, seen = [], set()
        for p in parsed:
            if not isinstance(p, str):
                continue
            mt = match_to_list(p)
            if mt and mt not in seen:
                seen.add(mt); out.append(mt)
            if len(out) == 3:
                break
        return out, lat
    return None, 0.0


def main():
    keys = load_keys()
    d = np.load(os.path.join(DATA, "test.npz"))
    X, y = d["X"], d["y"].astype(int)

    rng = random.Random(42)
    idxs = []
    for c in range(len(CLASSES)):
        pool = np.where(y == c)[0].tolist()
        idxs += rng.sample(pool, min(PER_CLASS, len(pool)))
    rng.shuffle(idxs)

    n1 = n3 = done = 0
    lats = []
    fails = 0
    for k, i in enumerate(idxs):
        true = CLASSES[y[i]]
        try:
            top3, lat = call_groq(to_png_b64(X[i]), keys)
        except Exception as e:
            print("  call error:", e, flush=True)
            fails += 1
            continue
        if top3 is None:
            fails += 1
            continue
        done += 1
        lats.append(lat)
        if top3 and top3[0] == true:
            n1 += 1
        if true in top3:
            n3 += 1
        if (k + 1) % 20 == 0:
            print(f"  {k+1}/{len(idxs)} | running top1={n1/done*100:.1f}% top3={n3/done*100:.1f}%", flush=True)

    res = {
        "model": MODEL,
        "n_eval": done,
        "n_failed": fails,
        "top1": n1 / done if done else 0,
        "top3": n3 / done if done else 0,
        "latency_ms_mean": float(np.mean(lats)) if lats else 0,
    }
    with open(os.path.join(HERE, "results_groq.json"), "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=2)
    print(f"GROQ top1={res['top1']*100:.1f}% top3={res['top3']*100:.1f}% "
          f"latency={res['latency_ms_mean']:.0f} ms/img (n={done}, failed={fails})", flush=True)


if __name__ == "__main__":
    main()
