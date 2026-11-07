"""Fail-closed per-source policy, reloaded for every authenticated request.

This standalone RAG demo reuses the same signed-token identity verifier as
the audio pipeline; production would use OIDC + a shared authorization service.
"""
import json
from pathlib import Path, PurePosixPath
import sys

_REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_REPO / 'architecture'))
from audio_access import verify_token, AccessDenied


class PolicyUnavailable(Exception):
    pass


def authorized_sources(policy_file: Path | None, tenant: str, subject: str) -> set[str]:
    if policy_file is None:
        raise PolicyUnavailable('Authorization policy unavailable')
    try:
        payload = json.loads(policy_file.read_text(encoding='utf-8'))
        if not isinstance(payload, dict):
            raise ValueError('Policy must be an object')
        permitted: set[str] = set()
        for source, grant in payload.items():
            if not isinstance(source, str) or not source or source.startswith('/') or (
                '..' in PurePosixPath(source).parts) or ('\\' in source):
                raise ValueError('Invalid source')
            if not isinstance(grant, dict) or set(grant) != {'tenant','readers'}:
                raise ValueError('Invalid grant')
            if not isinstance(grant['tenant'], str) or not grant['tenant'] or (
                not isinstance(grant['readers'], list)) or any(
                not isinstance(reader, str) or not reader for reader in grant['readers']
            ):
                raise ValueError('Invalid access list')
            if grant['tenant'] == tenant and subject in grant['readers']:
                permitted.add(source)
        return permitted
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError, TypeError) as exc:
        # Never fall back to public retrieval when a policy is missing/broken.
        raise PolicyUnavailable('Authorization policy unavailable') from exc
