"""
Download a subsample of QuickDraw numpy_bitmap data for the PoC classes.

Instead of pulling the full ~90 MB .npy per class, we use HTTP Range requests
to fetch only the .npy header + the first PER_CLASS rows (784 bytes each).
That cuts ~29 GB down to a couple hundred MB.

Output: ml/data/{train,val,test}.npz  (X uint8 [N,784], y int [N])
"""
import io
import json
import os
import sys
import urllib.parse
import numpy as np
import requests

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, os.environ.get("DATA_DIR", "data"))
BUCKET = "https://storage.googleapis.com/quickdraw_dataset/full/numpy_bitmap/"

PER_CLASS = int(os.environ.get("PER_CLASS", "9000"))   # rows fetched per class
N_TRAIN = int(os.environ.get("N_TRAIN", "7500"))
N_VAL   = int(os.environ.get("N_VAL", "750"))
N_TEST  = int(os.environ.get("N_TEST", "750"))
ROW = 784                 # 28*28 uint8

os.makedirs(DATA, exist_ok=True)
with open(os.path.join(HERE, os.environ.get("CLASSES_FILE", "classes.json")), encoding="utf-8") as f:
    CLASSES = json.load(f)


def parse_npy_header(head: bytes):
    """Return (data_offset, dtype, shape) from the leading bytes of a .npy file."""
    assert head[:6] == b"\x93NUMPY", "not a npy file"
    major = head[6]
    if major == 1:
        hlen = int.from_bytes(head[8:10], "little")
        hstart = 10
    else:
        hlen = int.from_bytes(head[8:12], "little")
        hstart = 12
    header = head[hstart:hstart + hlen].decode("latin1")
    data_offset = hstart + hlen
    # header looks like: {'descr': '|u1', 'fortran_order': False, 'shape': (N, 784), }
    d = eval(header, {"__builtins__": {}}, {})  # trusted: GCS quickdraw
    return data_offset, d["descr"], d["shape"]


def fetch_class(name: str, k: int) -> np.ndarray:
    url = BUCKET + urllib.parse.quote(name) + ".npy"
    # 1) read enough bytes to parse the header
    h = requests.get(url, headers={"Range": "bytes=0-255"}, timeout=60)
    h.raise_for_status()
    data_offset, descr, shape = parse_npy_header(h.content)
    total = shape[0]
    k = min(k, total)
    # 2) range-fetch the first k rows of raw data
    start = data_offset
    end = data_offset + k * ROW - 1
    r = requests.get(url, headers={"Range": f"bytes={start}-{end}"}, timeout=300)
    r.raise_for_status()
    arr = np.frombuffer(r.content, dtype=np.uint8)
    arr = arr[: (len(arr) // ROW) * ROW].reshape(-1, ROW)
    return arr


def main():
    Xtr, ytr, Xva, yva, Xte, yte = [], [], [], [], [], []
    for idx, name in enumerate(CLASSES):
        arr = fetch_class(name, PER_CLASS)
        n = len(arr)
        ntr = min(N_TRAIN, n - N_VAL - N_TEST)
        a, b = ntr, ntr + N_VAL
        Xtr.append(arr[:a]);          ytr += [idx] * a
        Xva.append(arr[a:b]);         yva += [idx] * (b - a)
        Xte.append(arr[b:b + N_TEST]); yte += [idx] * len(arr[b:b + N_TEST])
        print(f"[{idx+1:2d}/{len(CLASSES)}] {name:14s} got {n} rows", flush=True)

    def stack(xs, ys):
        return np.concatenate(xs).astype(np.uint8), np.array(ys, dtype=np.int16)

    Xtr, ytr = stack(Xtr, ytr)
    Xva, yva = stack(Xva, yva)
    Xte, yte = stack(Xte, yte)
    np.savez_compressed(os.path.join(DATA, "train.npz"), X=Xtr, y=ytr)
    np.savez_compressed(os.path.join(DATA, "val.npz"),   X=Xva, y=yva)
    np.savez_compressed(os.path.join(DATA, "test.npz"),  X=Xte, y=yte)
    print(f"DONE train={Xtr.shape} val={Xva.shape} test={Xte.shape}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
