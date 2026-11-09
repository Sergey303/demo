"""Demo trust boundary: signed identities and explicit per-record PostgreSQL grants.

The signing key must be controlled by a trusted identity issuer. This is not
OIDC, a login service or PostgreSQL row-level security.
"""
import base64
import hashlib
import hmac
import json
import os
import time


class AccessDenied(Exception):
    """Same error for nonexistent, ungranted, and revoked content."""


def _encode(data):
    return base64.urlsafe_b64encode(data).decode('ascii').rstrip('=')


def _decode(value):
    if not value or len(value) > 4096 or any(c not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_' for c in value):
        raise AccessDenied('Access denied')
    try:
        return base64.b64decode(value + '=' * (-len(value) % 4), altchars=b'-_', validate=True)
    except Exception as exc:
        raise AccessDenied('Access denied') from exc


def _secret():
    secret = os.environ.get('DEMO_AUTH_SECRET', '')
    if len(secret.encode('utf-8')) < 32:
        raise RuntimeError('DEMO_AUTH_SECRET must contain at least 32 bytes')
    return secret.encode('utf-8')


def _identity(value):
    return isinstance(value, str) and 1 <= len(value) <= 128 and all(
        c.isascii() and (c.isalnum() or c in '._-') for c in value
    )


def issue_token(tenant, subject, *, ttl_seconds=300):
    """Only an offline trusted issuer may call this. Never expose via HTTP."""
    if not _identity(tenant) or not _identity(subject) or not isinstance(ttl_seconds, int) or not 1 <= ttl_seconds <= 3600:
        raise ValueError('Invalid identity or TTL')
    payload = _encode(json.dumps({'tenant':tenant,'sub':subject,'exp':int(time.time())+ttl_seconds},
                                 separators=(',',':'),sort_keys=True).encode())
    signature = _encode(hmac.new(_secret(),payload.encode('ascii'),hashlib.sha256).digest())
    return payload + '.' + signature


def verify_token(token):
    if not isinstance(token, str) or len(token) > 4096 or token.count('.') != 1:
        raise AccessDenied('Access denied')
    payload, signature = token.split('.')
    expected = _encode(hmac.new(_secret(),payload.encode('utf-8'),hashlib.sha256).digest())
    if not hmac.compare_digest(expected,signature):
        raise AccessDenied('Access denied')
    try:
        claims=json.loads(_decode(payload))
    except (ValueError, TypeError) as exc:
        raise AccessDenied('Access denied') from exc
    if not isinstance(claims,dict) or set(claims) != {'tenant','sub','exp'} or not _identity(claims['tenant']) or not _identity(claims['sub']) or not isinstance(claims['exp'],int) or isinstance(claims['exp'],bool) or claims['exp'] <= int(time.time()) or claims['exp'] > int(time.time())+3600:
        raise AccessDenied('Access denied')
    return claims['tenant'], claims['sub']


def grant_read(dsn, job_id, tenant, subject):
    """Trusted administrative operation, not a user-facing endpoint."""
    if not _identity(tenant) or not _identity(subject):
        raise ValueError('Invalid identity')
    import psycopg
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("""INSERT INTO audio_read_grants(job_id,tenant_id,subject_id)
                           SELECT id,%s,%s FROM jobs WHERE id=%s AND kind IN ('audio','document')
                             AND tenant_id=%s
                           ON CONFLICT DO NOTHING RETURNING job_id""",
                        (tenant,subject,job_id,tenant))
            # Existing grant is also a valid idempotent operation.
            if cur.fetchone() is None:
                cur.execute("""SELECT 1 FROM audio_read_grants WHERE job_id=%s AND
                               tenant_id=%s AND subject_id=%s""",(job_id,tenant,subject))
                if cur.fetchone() is None:
                    raise AccessDenied('Access denied')


def revoke_read(dsn, job_id, tenant, subject):
    if not _identity(tenant) or not _identity(subject):
        raise ValueError('Invalid identity')
    import psycopg
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("""DELETE FROM audio_read_grants
                           WHERE job_id=%s AND tenant_id=%s AND subject_id=%s""",
                        (job_id,tenant,subject))


def assign_tenant(dsn, job_id, tenant):
    """One-time trusted local ingestion binding; no arbitrary tenant changes."""
    if not _identity(tenant) or tenant == 'unassigned':
        raise ValueError('Invalid tenant')
    import psycopg
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("""UPDATE jobs SET tenant_id=%s WHERE id=%s
                           AND kind IN ('audio','document') AND tenant_id='unassigned'
                           RETURNING id""", (tenant,job_id))
            if cur.fetchone() is None:
                raise AccessDenied('Access denied')
