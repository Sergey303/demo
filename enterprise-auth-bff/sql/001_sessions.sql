-- Apply manually to a SEPARATE session database, using an administration role.
-- Application role: SELECT/INSERT/UPDATE on sessions; SELECT/INSERT on audit;
-- USAGE/SELECT on audit sequence. No schema ownership, DELETE, TRUNCATE or DDL.
BEGIN;
CREATE TABLE ep12_bff_sessions (
    sid_hash bytea PRIMARY KEY CHECK (octet_length(sid_hash) = 32),
    issuer text NOT NULL CHECK (length(issuer) BETWEEN 1 AND 2048),
    oidc_sub text NOT NULL CHECK (length(oidc_sub) BETWEEN 1 AND 255),
    tenant text NOT NULL CHECK (tenant ~ '^[A-Za-z0-9._-]{1,128}$'),
    subject text NOT NULL CHECK (subject ~ '^[A-Za-z0-9._-]{1,128}$'),
    issued_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL CHECK (expires_at > issued_at AND expires_at <= issued_at + interval '30 minutes'),
    revoked_at timestamptz
);
CREATE INDEX ep12_bff_sessions_account ON ep12_bff_sessions(issuer, oidc_sub, tenant, subject) WHERE revoked_at IS NULL;
CREATE TABLE ep12_bff_session_audit (
    event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sid_hash bytea NOT NULL CHECK (octet_length(sid_hash) = 32),
    event_kind text NOT NULL CHECK (event_kind IN ('created', 'revoked', 'revoke_all')),
    occurred_at timestamptz NOT NULL DEFAULT statement_timestamp()
);
-- Defense against accidental audit mutation even by ordinary table writers.
-- The database/schema owner remains outside this security boundary.
CREATE FUNCTION ep12_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Session audit is append-only'; END $$;
CREATE TRIGGER ep12_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON ep12_bff_session_audit
    FOR EACH STATEMENT EXECUTE FUNCTION ep12_audit_immutable();
COMMIT;
