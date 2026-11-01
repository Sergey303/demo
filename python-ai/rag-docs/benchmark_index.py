"""Repeatable exact cosine vs HNSW benchmark on normalized synthetic vectors.

Synthetic vectors isolate indexing cost from model quality. This is NOT a neural
retrieval benchmark. Separate search-only latency from index-build cost.
"""
import argparse
import json
import time
import numpy as np


def percentile_ms(samples, p):
    return round(float(np.percentile(samples, p)) * 1000, 3)


def run(count=10000, dimensions=128, queries=500, k=10, ef=64, seed=42):
    import hnswlib
    if not (count >= k >= 1 and dimensions > 0 and queries > 0 and ef >= k):
        raise ValueError('Invalid benchmark dimensions')
    rng = np.random.default_rng(seed)
    data = rng.normal(size=(count, dimensions)).astype('float32')
    data /= np.maximum(np.linalg.norm(data, axis=1, keepdims=True), 1e-12)
    q = rng.normal(size=(queries, dimensions)).astype('float32')
    q /= np.maximum(np.linalg.norm(q, axis=1, keepdims=True), 1e-12)
    # Keep BLAS thread behavior explicit; exact NumPy multiplication may use multiple threads.
    index = hnswlib.Index(space='cosine', dim=dimensions)
    start = time.perf_counter()
    index.init_index(max_elements=count, ef_construction=200, M=16, random_seed=seed)
    index.add_items(data, np.arange(count), num_threads=1)
    build_s = time.perf_counter()-start
    index.set_ef(ef)
    exact_times, approx_times, recalls = [], [], []
    for query in q:
        start = time.perf_counter()
        scores = data @ query
        exact = np.argpartition(-scores, k-1)[:k]
        exact = exact[np.argsort(-scores[exact], kind='stable')]
        exact_times.append(time.perf_counter()-start)
        start = time.perf_counter()
        predicted, _ = index.knn_query(query.reshape(1, -1), k=k, num_threads=1)
        approx_times.append(time.perf_counter()-start)
        recalls.append(len(set(exact).intersection(predicted[0]))/k)
    return {
        'n':count,'dim':dimensions,'queries':queries,'k':k,'ef_search':ef,'seed':seed,
        'hnsw_build_seconds':round(build_s,3),
        'recall_at_k_against_exact':round(float(np.mean(recalls)),4),
        'exact_ms':{f'p{p}':percentile_ms(exact_times,p) for p in [50,95,99]},
        'hnsw_ms':{f'p{p}':percentile_ms(approx_times,p) for p in [50,95,99]},
        'input_vector_bytes':int(data.nbytes),
        'caveats':'Random vectors, single HNSW thread, warmed implementation order, no model inference. RSS/memory benchmark not available here.'
    }


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--n',type=int,default=10000)
    parser.add_argument('--dim',type=int,default=128)
    parser.add_argument('--queries',type=int,default=500)
    parser.add_argument('--k',type=int,default=10)
    parser.add_argument('--ef',type=int,default=64)
    a=parser.parse_args()
    print(json.dumps(run(a.n,a.dim,a.queries,a.k,a.ef),indent=2))
