"""
Step 1 of TF.js export: load the trained Keras model and re-save it as a
TF SavedModel (a portable, version-stable format the tfjs converter reads
reliably). Run with the TRAINING venv (TF 2.21 / Keras 3).

Step 2 (separate, tfjs venv):
  tensorflowjs_converter --input_format=tf_saved_model \
    --output_format=tfjs_graph_model ml/saved_model_full public/model
"""
import os
import tensorflow as tf

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(HERE, os.environ.get("MODEL_PATH", "model_full.keras"))
OUT = os.path.join(HERE, os.environ.get("SAVED_DIR", "saved_model_full"))

model = tf.keras.models.load_model(MODEL_PATH)
# Keras 3: export() writes a SavedModel with a serving signature.
model.export(OUT)
print(f"EXPORTED SavedModel -> {OUT}", flush=True)
