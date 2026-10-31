"""Compare neural ranking with a lexical baseline on the same labeled corpus."""
import json
import math
import re
from collections import Counter
from pathlib import Path
from app.core import KnowledgeBase, chunk_documents

ROOT = Path(__file__).resolve().parent


def lexical_rank(question: str, passages: list) -> list[str]:
    """Transparent TF-IDF cosine baseline with corpus-local inverse document frequency."""
    tokenize = lambda s: re.findall(r'\w+', s.casefold())
    docs = [Counter(tokenize(p.text)) for p in passages]
    df = Counter(token for doc in docs for token in doc)
    def weight(token):
        return math.log((len(docs) + 1) / (df[token] + 1)) + 1
    query = Counter(tokenize(question))
    qnorm = math.sqrt(sum((f * weight(t)) ** 2 for t, f in query.items())) or 1
    scored = []
    for i, doc in enumerate(docs):
        dot = sum(f * doc.get(t, 0) * weight(t)**2 for t, f in query.items())
        dnorm = math.sqrt(sum((f * weight(t)) ** 2 for t, f in doc.items())) or 1
        scored.append((dot / (qnorm * dnorm), i))
    return [passages[i].source for _, i in sorted(scored, key=lambda s: (-s[0], s[1]))]


def retrieval_metrics(results: list[list[str]], expected: list[str], k: int = 1) -> dict:
    if len(results) != len(expected) or not expected or k < 1:
        raise ValueError('Expected nonempty matched questions/labels and positive k')
    hit = [label in predictions[:k] for label, predictions in zip(expected, results)]
    ranks = [next((1 / (i + 1) for i, source in enumerate(predictions[:k]) if source == label), 0.0)
             for label, predictions in zip(expected, results)]
    return {'questions': len(expected), f'recall_at_{k}': sum(hit) / len(hit),
            f'mrr_at_{k}': sum(ranks) / len(ranks)}


def main():
    from sentence_transformers import SentenceTransformer
    cases = json.loads((ROOT / 'eval' / 'questions.json').read_text(encoding='utf8'))
    passages = chunk_documents(ROOT / 'eval' / 'corpus')
    labels = [case['source'] for case in cases]
    lexical = [lexical_rank(case['question'], passages) for case in cases]
    encoder = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
    kb = KnowledgeBase(passages, encoder)
    neural = [[hit['source'] for hit in kb.search(case['question'], len(passages))] for case in cases]
    print(json.dumps({'lexical': retrieval_metrics(lexical, labels),
                      'neural': retrieval_metrics(neural, labels),
                      'examples': [{'question': case['question'], 'expected': case['source'],
                                    'lexical_top': a[0], 'neural_top': b[0]}
                                   for case, a, b in zip(cases, lexical, neural)],
                      'warning': 'Tiny illustrative corpus: no representative quality claim.'}, indent=2))


if __name__ == '__main__':
    main()
