# Image inference

The standard-library classifier learns two centroids from four authored 8×8 grayscale stripe images. Features are the ranges of column and row mean intensity. The six distinct holdout images vary stripe position, width, and intensity. The report includes accuracy, confusion counts, and a SHA-256 of the authored split specifications in `inference.py`. All six holdout images are classified correctly in this synthetic exercise.

Run from the repository root.

```bash
python3 -B EdgeAI/scenarios/image-inference/inference.py
python3 -B EdgeAI/scenarios/image-inference/inference.py --image path/to/image.pgm
```

The file input accepts the exact binary PGM header `P5\n8 8\n255\n` followed by exactly 64 grayscale bytes in row-major order. Equal distances cause abstention. The distance margin is a model score with no probability calibration. The fixtures exercise the inference pipeline on simple orientations. External image quality, broader format support, and provider parity remain open.
