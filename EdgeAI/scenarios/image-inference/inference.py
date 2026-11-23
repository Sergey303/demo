"""Fit a small stripe classifier on authored grayscale images."""
import argparse
from hashlib import sha256
import json
from pathlib import Path
from statistics import mean

SIZE = 8
HEADER = b"P5\n8 8\n255\n"
# Axis, starting position, width, background level, stripe level.
TRAIN = (
    ("vertical", 1, 2, 20, 220), ("vertical", 4, 2, 30, 200),
    ("horizontal", 1, 2, 20, 220), ("horizontal", 4, 2, 30, 200),
)
HOLDOUT = (
    ("vertical", 0, 3, 40, 178), ("vertical", 6, 2, 15, 165),
    ("vertical", 3, 1, 50, 130), ("horizontal", 0, 2, 10, 210),
    ("horizontal", 5, 3, 45, 170), ("horizontal", 2, 1, 55, 145),
)


def render(spec):
    label, start, width, background, stripe = spec
    return bytes(
        stripe if start <= (x if label == "vertical" else y) < start + width else background
        for y in range(SIZE) for x in range(SIZE)
    )


def features(pixels):
    rows = [pixels[i:i + SIZE] for i in range(0, len(pixels), SIZE)]
    row_means = [mean(row) for row in rows]
    col_means = [mean(col) for col in zip(*rows)]
    return max(col_means) - min(col_means), max(row_means) - min(row_means)


def fit():
    centroids = {}
    for label in ("vertical", "horizontal"):
        examples = [features(render(spec)) for spec in TRAIN if spec[0] == label]
        x, y = zip(*examples)
        centroids[label] = (mean(x), mean(y))
    return centroids


def predict(model, pixels):
    x, y = features(pixels)
    distances = {label: (x - cx)**2 + (y - cy)**2 for label, (cx, cy) in model.items()}
    ranked = sorted(distances, key=distances.get)
    margin = distances[ranked[1]] - distances[ranked[0]]
    return {"label": ranked[0] if margin else None, "distance_margin": margin}


def evaluate():
    model = fit()
    labels = (*model, "abstained")
    counts = {label: dict.fromkeys(labels, 0) for label in model}
    for spec in HOLDOUT:
        answer = predict(model, render(spec))["label"]
        counts[spec[0]][answer or "abstained"] += 1
    return {
        "model": "stripe-centroid-v1",
        "dataset": "authored-synthetic-stripes-v1",
        "dataset_sha256": sha256(json.dumps((TRAIN, HOLDOUT)).encode()).hexdigest(),
        "training_records": len(TRAIN),
        "holdout": {
            "records": len(HOLDOUT),
            "accuracy": sum(counts[label][label] for label in model) / len(HOLDOUT),
            "confusion": counts,
        },
    }


def read_image(path):
    size = len(HEADER) + SIZE**2
    with path.open("rb") as stream:
        data = stream.read(size + 1)
    if len(data) != size or not data.startswith(HEADER):
        raise ValueError("expected exact P5 PGM header for 8x8, max 255, and 64 pixel bytes")
    return data[len(HEADER):]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, help="classify one local 8x8 P5 PGM")
    args = parser.parse_args()
    try:
        report = predict(fit(), read_image(args.image)) if args.image else evaluate()
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
