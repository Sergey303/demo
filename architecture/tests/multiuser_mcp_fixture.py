"""Trusted test-only stdio entrypoint: real MCP/SQL, deterministic encoder only."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import unified_search

class Encoder:
    def encode(self, texts):
        return [[.6,.8] for _ in texts]

unified_search.local_encoder = lambda: Encoder()
from mcp_evidence_server import server
if __name__ == '__main__':
    server.run(transport='stdio')
