"""
Offline evaluation of the trained CNN on the held-out test set.
Prints top-1 / top-3 accuracy, mean inference latency, and the most-confused pairs.
Writes ml/results_cnn.json
"""
import json
import os
import time
import numpy as np
import tensorflow as tf

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, os.environ.get("DATA_DIR", "data"))
MODEL_PATH = os.path.join(HERE, os.environ.get("MODEL_PATH", "model.keras"))
RESULTS_PATH = os.path.join(HERE, os.environ.get("RESULTS_PATH", "results_cnn.json"))

with open(os.path.join(HERE, os.environ.get("CLASSES_FILE", "classes.json")), encoding="utf-8") as f:
    CLASSES = json.load(f)


def main():
    d = np.load(os.path.join(DATA, "test.npz"))
    X = d["X"].astype("float32").reshape(-1, 28, 28, 1) / 255.0
    y = d["y"].astype("int32")

    model = tf.keras.models.load_model(MODEL_PATH)

    # latency: single-image inference, averaged
    warm = model.predict(X[:32], verbose=0)
    t0 = time.perf_counter()
    for i in range(200):
        model.predict(X[i:i+1], verbose=0)
    lat_ms = (time.perf_counter() - t0) / 200 * 1000

    probs = model.predict(X, batch_size=512, verbose=0)
    top1 = probs.argmax(1)
    top3 = np.argsort(probs, 1)[:, -3:]

    acc1 = float((top1 == y).mean())
    acc3 = float(np.mean([yi in row for yi, row in zip(y, top3)]))

    # confusion: most frequent wrong (true -> predicted) pairs
    wrong = top1 != y
    pairs = {}
    for t, p in zip(y[wrong], top1[wrong]):
        pairs[(int(t), int(p))] = pairs.get((int(t), int(p)), 0) + 1
    worst = sorted(pairs.items(), key=lambda kv: -kv[1])[:12]
    worst_named = [
        {"true": CLASSES[t], "pred": CLASSES[p], "count": c} for (t, p), c in worst
    ]

    res = {
        "n_test": int(len(y)),
        "top1": acc1,
        "top3": acc3,
        "latency_ms_single": lat_ms,
        "worst_pairs": worst_named,
    }
    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=2)

    print(f"CNN  top1={acc1*100:.1f}%  top3={acc3*100:.1f}%  "
          f"latency={lat_ms:.1f} ms/img  (n={len(y)})", flush=True)
    print("Most confused:", flush=True)
    for w in worst_named:
        print(f"  {w['true']:12s} -> {w['pred']:12s}  ({w['count']})", flush=True)


if __name__ == "__main__":
    main()
