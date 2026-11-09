-- EP-09: narrowly scoped agent note proposals and approved writes.
-- No automatic tool-initiated note writes. Only trusted /agent/confirm can consume.
CREATE TABLE agent_note_actions (
  id uuid PRIMARY KEY,
  tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
  subject_id text NOT NULL CHECK (length(subject_id) BETWEEN 1 AND 128),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  proposed_text text NOT NULL CHECK (length(proposed_text) BETWEEN 1 AND 500),
  nonce_sha256 char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  decision text CHECK (decision IN ('approved','rejected')),
  CHECK (consumed_at IS NULL OR decision IS NOT NULL)
);
CREATE INDEX agent_note_actions_owner_ix ON agent_note_actions (tenant_id,subject_id,created_at DESC);
CREATE TABLE agent_review_notes (
  id uuid PRIMARY KEY,
  approval_id uuid NOT NULL UNIQUE REFERENCES agent_note_actions(id),
  tenant_id text NOT NULL,
  subject_id text NOT NULL,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  note_text text NOT NULL CHECK (length(note_text) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_review_notes_owner_ix ON agent_review_notes (tenant_id,subject_id,job_id,created_at DESC);
