"""Evaluate retrieval with labeled question -> expected source pairs.
Run after installing requirements. No model training/evaluation data overlap in this demo.
"""
import json
from pathlib import Path
from app.core import KnowledgeBase, chunk_documents

ROOT = Path(__file__).resolve().parent


def retrieval_metrics(results: list[list[str]], expected: list[str], k: int = 3) -> dict:
    if len(results) != len(expected) or not expected:
        raise ValueError('Expected nonempty matching questions and labels')
    hit = [label in predictions[:k] for label, predictions in zip(expected, results)]
    ranks = [next((1 / (i + 1) for i, source in enumerate(predictions[:k]) if source == label), 0.0)
             for label, predictions in zip(expected, results)]
    return {'questions': len(expected), f'recall_at_{k}': sum(hit) / len(hit),
            f'mrr_at_{k}': sum(ranks) / len(ranks)}


def main():
    from sentence_transformers import SentenceTransformer
    examples = json.loads((ROOT / 'eval' / 'questions.json').read_text(encoding='utf8'))
    encoder = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
    kb = KnowledgeBase(chunk_documents(ROOT / 'documents'), encoder)
    predictions = [[hit['source'] for hit in kb.search(item['question'], 3)] for item in examples]
    metrics = retrieval_metrics(predictions, [item['source'] for item in examples])
    print(json.dumps(metrics, indent=2))


if __name__ == '__main__':
    main()
