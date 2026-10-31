"""Inference-only FastAPI service; train before starting."""
from functools import lru_cache
from pathlib import Path
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from .model import IntentNet, LABELS, encode

app = FastAPI(title="PyTorch ticket classification", version="1.0.0")

class Ticket(BaseModel):
    text: str = Field(min_length=1, max_length=4000)

@lru_cache
def load_model():
    path = Path(__file__).resolve().parents[1] / "artifacts" / "intent_weights.pt"
    if not path.exists():
        raise FileNotFoundError("Train the model first: python train.py")
    model = IntentNet()
    model.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
    model.eval()
    return model

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(ticket: Ticket):
    try:
        model = load_model()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    with torch.inference_mode():
        logits = model(torch.tensor([encode(ticket.text)], dtype=torch.long))
        scores = torch.softmax(logits, dim=1)[0].tolist()
    ranked = sorted(zip(LABELS, scores), key=lambda pair: pair[1], reverse=True)
    return {"label": ranked[0][0], "confidence": round(ranked[0][1], 4),
            "scores": {label: round(score, 4) for label, score in ranked},
            "review_required": ranked[0][1] < 0.7}
