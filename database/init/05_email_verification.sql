-- =============================================================================
-- Migration 004: Email verification
-- Applied automatically by docker-entrypoint-initdb.d on fresh databases.
-- For existing databases run database/migrations/004_email_verification.sql.
-- =============================================================================

ALTER TABLE users
    ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;

-- Усі юзери, які вже сидять у БД (демо-сід), — одразу верифіковані.
UPDATE users SET is_verified = true;

CREATE TABLE email_verifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    code        VARCHAR(10) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    CONSTRAINT fk_ev_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_verifications_user_id    ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_created_at ON email_verifications(created_at DESC);
