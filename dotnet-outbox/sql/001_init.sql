-- Demo schema; intentionally no employer code, data or confidential architecture.
-- All business state and its outbox event are written in ONE database transaction.
CREATE TABLE IF NOT EXISTS jobs (
    id uuid PRIMARY KEY,
    idempotency_key text NOT NULL UNIQUE,
    payload_sha256 char(64) NOT NULL,
    input text NOT NULL,
    status text NOT NULL CHECK (status IN ('queued', 'done', 'failed')),
    result jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox (
    id uuid PRIMARY KEY,
    job_id uuid NOT NULL UNIQUE REFERENCES jobs(id),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbox_ready_idx
    ON outbox (next_attempt_at, created_at)
    WHERE processed_at IS NULL;
