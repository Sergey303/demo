-- Demo-only mandatory tenant and explicit grant list for audio retrieval.
-- Existing audio jobs migrate to a quarantine tenant with no grants.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'unassigned';
CREATE TABLE IF NOT EXISTS audio_read_grants (
    job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    tenant_id text NOT NULL,
    subject_id text NOT NULL,
    PRIMARY KEY(job_id, tenant_id, subject_id),
    CONSTRAINT audio_read_grants_subject_not_blank CHECK (length(subject_id)>0),
    CONSTRAINT audio_read_grants_tenant_not_blank CHECK (length(tenant_id)>0)
);
CREATE INDEX IF NOT EXISTS audio_read_grants_subject_idx
    ON audio_read_grants(tenant_id,subject_id,job_id);
-- A grant is valid only while the document remains in its original tenant.
-- Revoking/deleting the grant takes effect on the next retrieval read.
