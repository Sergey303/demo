"""Optional cross-encoder reranking of dense retrieval candidates."""
from dataclasses import replace
import math

class CrossEncoderReranker:
    def __init__(self, model='Xenova/ms-marco-MiniLM-L-6-v2'):
        from fastembed.rerank.cross_encoder import TextCrossEncoder
        self.model = TextCrossEncoder(model_name=model)

    def score(self, question, passages):
        return list(self.model.rerank(question, passages))

class RerankedIndex:
    def __init__(self, retriever, ranker, candidate_k=12):
        if candidate_k < 1:
            raise ValueError('candidate_k must be positive')
        self.retriever = retriever
        self.records = retriever.records
        self.ranker = ranker
        self.candidate_k = candidate_k

    def search(self, question, k=3):
        if not question.strip() or k < 1:
            raise ValueError('Require question and positive k')
        candidates = self.retriever.search(question, k=max(k, self.candidate_k))
        if not candidates:
            return []
        scores = list(self.ranker.score(question, [x.text for x in candidates]))
        if len(scores) != len(candidates) or not all(math.isfinite(float(x)) for x in scores):
            raise ValueError('Reranker returned invalid scores')
        ordered = sorted(enumerate(candidates), key=lambda it: (-float(scores[it[0]]),it[0]))
        return [replace(hit, score=round(float(scores[i]),6)) for i, hit in ordered[:k]]
