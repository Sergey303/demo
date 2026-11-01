"""Evaluate ANN fidelity and document relevance using real text embeddings.

Requires fastembed, numpy and hnswlib. Not a synthetic vector experiment.
"""
import argparse
import json
import time
from pathlib import Path

import numpy as np

from app.core import chunk_documents

ROOT = Path(__file__).resolve().parent


def evaluate(vectors, queries, passages, cases, k=1, ef=32):
    import hnswlib
    if not (0 < k <= len(passages) and ef >= k):
        raise ValueError('Invalid k or ef')
    assert len(vectors) == len(passages) and len(queries) == len(cases)
    vectors = np.asarray(vectors, dtype=np.float32)
    queries = np.asarray(queries, dtype=np.float32)
    if vectors.ndim != 2 or queries.shape[1] != vectors.shape[1]:
        raise ValueError('Invalid vector dimensions')
    for array in (vectors, queries):
        if not np.all(np.isfinite(array)):
            raise ValueError('Non-finite embeddings')
        array /= np.maximum(np.linalg.norm(array, axis=1, keepdims=True), 1e-12)
    index = hnswlib.Index(space='cosine', dim=vectors.shape[1])
    start = time.perf_counter()
    index.init_index(max_elements=len(vectors), ef_construction=200, M=16, random_seed=42)
    index.add_items(vectors, np.arange(len(vectors)), num_threads=1)
    build = time.perf_counter()-start
    index.set_ef(ef)
    times = {'exact': [], 'hnsw': []}
    correct = {'exact': 0, 'hnsw': 0}
    shared = []
    examples = []
    for query, case in zip(queries, cases):
        begin = time.perf_counter()
        similarities = vectors @ query
        exact = np.argsort(-similarities, kind='stable')[:k]
        times['exact'].append(time.perf_counter()-begin)
        begin = time.perf_counter()
        approximate, _ = index.knn_query(query.reshape(1, -1), k=k, num_threads=1)
        approximate = approximate[0]
        times['hnsw'].append(time.perf_counter()-begin)
        shared.append(len(set(exact).intersection(approximate))/k)
        expected = case['source']
        for name, indices in [('exact', exact), ('hnsw', approximate)]:
            correct[name] += any(passages[i].source == expected for i in indices)
        examples.append({'question':case['question'], 'expected':expected,
                         'exact_top':passages[int(exact[0])].source,
                         'hnsw_top':passages[int(approximate[0])].source})
    return {'passages':len(passages), 'questions':len(cases), 'dim':int(vectors.shape[1]),
            'k':k, 'ef':ef, 'build_seconds':round(build,5),
            'ann_recall_against_exact':round(float(np.mean(shared)),4),
            'labeled_recall':{x:round(correct[x]/len(cases),4) for x in correct},
            'latency_ms':{x:{'p50':round(float(np.percentile(t,50))*1000,4),
                             'p95':round(float(np.percentile(t,95))*1000,4),
                             'p99':round(float(np.percentile(t,99))*1000,4)} for x,t in times.items()},
            'examples':examples}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='BAAI/bge-small-en-v1.5')
    parser.add_argument('--k', type=int, default=1)
    parser.add_argument('--ef', type=int, default=32)
    args = parser.parse_args()
    from fastembed import TextEmbedding
    cases = json.loads((ROOT / 'eval/questions.json').read_text())
    passages = chunk_documents(ROOT / 'eval/corpus')
    model = TextEmbedding(model_name=args.model, cache_dir=str(ROOT / '.model-cache'))
    vectors = list(model.embed([p.text for p in passages]))
    questions = list(model.embed([x['question'] for x in cases]))
    result = evaluate(vectors, questions, passages, cases, args.k, args.ef)
    result['model'] = args.model
    result['limitations'] = 'Three labeled questions and small text corpus: illustrative only. Embedding inference excluded from search timing.'
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
