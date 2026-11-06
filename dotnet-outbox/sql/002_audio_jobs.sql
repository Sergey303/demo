-- Backward-compatible demo migration. Run once against the disposable demo DB.
-- Media is stored durably inside PostgreSQL before the API returns 202.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS audio_payload bytea;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS audio_name text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_kind_check') THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_kind_check CHECK (kind IN ('text','audio'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS jobs_kind_id_idx ON jobs(kind,id);
