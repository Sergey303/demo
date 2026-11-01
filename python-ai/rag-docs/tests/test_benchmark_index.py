from benchmark_index import run


def test_exact_reference_and_hnsw_with_identical_vectors():
    result = run(count=128, dimensions=16, queries=5, k=5, ef=64)
    assert 0 <= result['recall_at_k_against_exact'] <= 1
    assert result['n'] == 128
    assert result['input_vector_bytes'] == 128 * 16 * 4
    assert result['exact_ms']['p50'] >= 0
    assert result['hnsw_ms']['p50'] >= 0
