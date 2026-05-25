"""
Browser-parity diagnostic.

The model was trained on QuickDraw's native 28x28 rendering. The browser
preprocess() re-renders a drawing: crop to ink bbox -> scale longest side to
TARGET, centered in 28 -> (optional) dilate strokes. If TARGET/dilation don't
match QuickDraw's effective scale, in-browser accuracy drops below offline.

This replicates that geometric transform in Python and runs it on the held-out
test set across several TARGET sizes (with/without 3x3 dilation), comparing to
the clean baseline. The variant that best matches baseline = the params to use
in lib/quickdraw-model.ts.
"""
import json, os
import numpy as np
import tensorflow as tf
from PIL import Image
from scipy.ndimage import maximum_filter

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data_full")
PER_CLASS_EVAL = 30  # sampled per class for speed

d = np.load(os.path.join(DATA, "test.npz"))
X, y = d["X"], d["y"].astype(int)

# balanced subsample
idxs = []
for c in range(int(y.max()) + 1):
    pool = np.where(y == c)[0]
    idxs += list(pool[:PER_CLASS_EVAL])
idxs = np.array(idxs)
Xs, ys = X[idxs], y[idxs]
print(f"eval images: {len(Xs)}", flush=True)

model = tf.keras.models.load_model(os.path.join(HERE, "model_full.keras"))


def topk(batch):
    probs = model.predict(batch, batch_size=512, verbose=0)
    t1 = (probs.argmax(1) == ys).mean()
    t3 = np.mean([ys[i] in probs[i].argsort()[-3:] for i in range(len(ys))])
    return t1 * 100, t3 * 100


def transform(bitmap, target, dilate):
    """Replicate browser preprocess on a 28x28 white-on-black QuickDraw bitmap."""
    img = bitmap.reshape(28, 28).astype(np.uint8)
    ys_, xs_ = np.where(img > 40)  # ink = bright pixels
    if len(xs_) == 0:
        return img.astype(np.float32) / 255.0
    x0, x1, y0, y1 = xs_.min(), xs_.max(), ys_.min(), ys_.max()
    crop = img[y0:y1 + 1, x0:x1 + 1]
    bh, bw = crop.shape
    scale = target / max(bw, bh)
    nw, nh = max(1, round(bw * scale)), max(1, round(bh * scale))
    pil = Image.fromarray(crop).resize((nw, nh), Image.BILINEAR)
    canvas = np.zeros((28, 28), dtype=np.float32)
    ox, oy = (28 - nw) // 2, (28 - nh) // 2
    canvas[oy:oy + nh, ox:ox + nw] = np.asarray(pil, dtype=np.float32)
    out = canvas / 255.0
    if dilate:
        out = maximum_filter(out, size=3)
    return out


# Baseline: raw QuickDraw bitmaps as trained
base = Xs.reshape(-1, 28, 28, 1).astype("float32") / 255.0
b1, b3 = topk(base)
print(f"\nBASELINE (raw QuickDraw)    top1={b1:5.1f}%  top3={b3:5.1f}%\n", flush=True)

print(f"{'TARGET':>7} {'dilate':>7} {'top1':>7} {'top3':>7}", flush=True)
for target in (20, 22, 24, 26, 28):
    for dilate in (False, True):
        batch = np.stack([transform(Xs[i], target, dilate) for i in range(len(Xs))])[..., None]
        t1, t3 = topk(batch)
        print(f"{target:>7} {str(dilate):>7} {t1:6.1f}% {t3:6.1f}%", flush=True)
