"""Train on miniature illustrative examples. Never claim benchmark accuracy from this set."""
import csv
import json
import random
from pathlib import Path
import torch
from app.model import IntentNet, LABELS, encode

ROOT = Path(__file__).resolve().parent

def load_data():
    with (ROOT / "data" / "tickets.csv").open(encoding="utf8", newline="") as stream:
        return [(row["text"], LABELS.index(row["label"])) for row in csv.DictReader(stream)]

def train(output: Path, epochs: int = 70):
    random.seed(42)
    torch.manual_seed(42)
    examples = load_data()
    random.shuffle(examples)
    # Keep held-out examples separate from optimization.
    n = max(3, round(len(examples) * .2))
    train_rows, test_rows = examples[n:], examples[:n]
    x = torch.tensor([encode(t) for t, _ in train_rows], dtype=torch.long)
    y = torch.tensor([label for _, label in train_rows], dtype=torch.long)
    model = IntentNet()
    optimizer = torch.optim.AdamW(model.parameters(), lr=.008)
    for _ in range(epochs):
        optimizer.zero_grad()
        loss = torch.nn.functional.cross_entropy(model(x), y)
        loss.backward()
        optimizer.step()
    model.eval()
    with torch.no_grad():
        predictions = model(torch.tensor([encode(t) for t, _ in test_rows], dtype=torch.long)).argmax(1).tolist()
    correct = sum(pred == label for pred, (_, label) in zip(predictions, test_rows))
    accuracy = correct / len(test_rows)
    output.mkdir(parents=True, exist_ok=True)
    # Save weights only, not arbitrary pickle objects.
    torch.save(model.state_dict(), output / "intent_weights.pt")
    (output / "metrics.json").write_text(json.dumps({
        "labels": LABELS, "train_samples": len(train_rows), "test_samples": len(test_rows),
        "heldout_accuracy": accuracy, "seed": 42, "epochs": epochs,
        "warning": "Toy dataset; accuracy is not representative of real-world performance."
    }, indent=2), encoding="utf8")
    print(f"Held-out toy accuracy: {accuracy:.1%}; test size: {len(test_rows)}")

if __name__ == "__main__":
    train(ROOT / "artifacts")
