-- Short transactions around claim and completion; inference happens outside SQL.
-- A unique lease token fences stale workers after expiration/reclaim.
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS lease_token uuid;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS lease_until timestamptz;
CREATE INDEX IF NOT EXISTS outbox_audio_lease_idx
    ON outbox (next_attempt_at, lease_until, created_at)
    WHERE processed_at IS NULL;
