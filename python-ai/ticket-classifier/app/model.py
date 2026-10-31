"""PyTorch neural intent classifier: token hashing, embedding pooling, MLP."""
import hashlib
import re
import torch
from torch import nn

LABELS = ["billing", "technical", "account"]
VOCAB_SIZE = 2048

def encode(text: str, length: int = 40) -> list[int]:
    tokens = re.findall(r"[^\W_]+", text.lower(), flags=re.UNICODE)[:length]
    ids = [int.from_bytes(hashlib.sha256(t.encode()).digest()[:4], "big") % (VOCAB_SIZE - 1) + 1 for t in tokens]
    return (ids + [0] * length)[:length]

class IntentNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.embedding = nn.Embedding(VOCAB_SIZE, 32, padding_idx=0)
        self.classifier = nn.Sequential(nn.Linear(32, 32), nn.ReLU(), nn.Linear(32, len(LABELS)))

    def forward(self, tokens):
        emb = self.embedding(tokens)
        mask = (tokens != 0).unsqueeze(-1)
        pooled = (emb * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1)
        return self.classifier(pooled)
