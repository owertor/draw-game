"""
Train a small CNN on the 50-class QuickDraw subsample.
Input: 28x28x1 grayscale (QuickDraw native: white strokes on black, values 0..1).
Saves: ml/model.keras
"""
import json
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, os.environ.get("DATA_DIR", "data"))
MODEL_PATH = os.path.join(HERE, os.environ.get("MODEL_PATH", "model.keras"))

with open(os.path.join(HERE, os.environ.get("CLASSES_FILE", "classes.json")), encoding="utf-8") as f:
    CLASSES = json.load(f)
NUM = len(CLASSES)


def load(split):
    d = np.load(os.path.join(DATA, f"{split}.npz"))
    X = d["X"].astype("float32") / 255.0
    X = X.reshape(-1, 28, 28, 1)
    return X, d["y"].astype("int32")


def main():
    Xtr, ytr = load("train")
    Xva, yva = load("val")
    print("train", Xtr.shape, "val", Xva.shape, flush=True)

    model = models.Sequential([
        layers.Input((28, 28, 1)),
        layers.Conv2D(32, 3, padding="same", activation="relu"),
        layers.BatchNormalization(),
        layers.MaxPool2D(),
        layers.Conv2D(64, 3, padding="same", activation="relu"),
        layers.BatchNormalization(),
        layers.MaxPool2D(),
        layers.Conv2D(128, 3, padding="same", activation="relu"),
        layers.BatchNormalization(),
        layers.MaxPool2D(),
        layers.Flatten(),
        layers.Dense(256, activation="relu"),
        layers.Dropout(0.4),
        layers.Dense(NUM, activation="softmax"),
    ])
    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=[
            "accuracy",
            tf.keras.metrics.SparseTopKCategoricalAccuracy(k=3, name="top3"),
        ],
    )
    model.summary()

    cbs = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_top3", mode="max", patience=3, restore_best_weights=True),
    ]
    model.fit(
        Xtr, ytr, validation_data=(Xva, yva),
        epochs=15, batch_size=256, callbacks=cbs, verbose=2,
    )
    model.save(MODEL_PATH)
    print(f"SAVED {MODEL_PATH}", flush=True)


if __name__ == "__main__":
    main()
