-- EP-03: documents reuse jobs, outbox, leases and the existing grant table.
-- The legacy 'audio_read_grants' table now guards BOTH audio and documents;
-- no second authorization store or independent processing queue.
-- Apply after 001..004 on disposable reliable_jobs only.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS document_name text;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_kind_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_kind_check
  CHECK (kind IN ('text','audio','document'));
CREATE INDEX IF NOT EXISTS jobs_document_tenant_idx
  ON jobs(tenant_id,created_at) WHERE kind='document';
