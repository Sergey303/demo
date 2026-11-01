"""BM25 + exact neural retrieval; source-level RRF for timestamped transcripts."""
from collections import Counter
import math
import re


def terms(text):
    return re.findall(r'\w+', text.casefold())


class HybridIndex:
    def __init__(self, neural, rrf_k=60):
        if rrf_k < 1:
            raise ValueError('rrf_k must be positive')
        self.neural = neural
        self.records = neural.records
        self.rrf_k = rrf_k
        self.tokens = [Counter(terms(r['text'])) for r in self.records]
        self.lengths = [sum(v.values()) for v in self.tokens]
        self.avgdl = sum(self.lengths) / len(self.lengths) if self.lengths else 1
        self.df = Counter(t for row in self.tokens for t in row)

    def lexical_scores(self, query):
        n = len(self.records)
        scores = []
        for i, row in enumerate(self.tokens):
            score = 0.0
            for token in set(terms(query)):
                if token not in row:
                    continue
                idf = math.log(1 + (n - self.df[token] + .5)/(self.df[token] + .5))
                tf = row[token]
                score += idf * tf * 2.2/(tf + 1.2*(.25 + .75*self.lengths[i]/self.avgdl))
            scores.append(score)
        return scores

    def search(self, query, k=3):
        if not query.strip() or k < 1:
            raise ValueError('Invalid query or k')
        if not self.records:
            return []
        from search import Hit
        # Aggregate to unique sources, so multiple chunks cannot vote repeatedly.
        dense = self.neural.search(query, k=len(self.records))
        dense_sources = list(dict.fromkeys(hit.source for hit in dense))
        lexical = self.lexical_scores(query)
        lexical_order = sorted(range(len(self.records)), key=lambda i: (-lexical[i], i))
        sparse_sources = list(dict.fromkeys(self.records[i]['source'] for i in lexical_order if lexical[i] > 0))
        votes = {}
        for order in (dense_sources, sparse_sources):
            for rank, source in enumerate(order, 1):
                votes[source] = votes.get(source, 0) + 1/(self.rrf_k + rank)
        # Preserve the highest-scoring dense fragment as evidence for that source.
        evidence = {hit.source:hit for hit in reversed(dense)}
        ranked = sorted(votes, key=lambda source:(-votes[source], dense_sources.index(source)))[:k]
        return [Hit(source, evidence[source].start, evidence[source].end,
                    evidence[source].text, round(votes[source],6)) for source in ranked]
