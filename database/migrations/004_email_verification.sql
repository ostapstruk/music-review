-- =============================================================================
-- Migration 004: Email verification
-- Description: Adds 6-digit code verification flow for new registrations.
-- Existing users are marked as verified, so the live site is not disrupted.
-- =============================================================================

ALTER TABLE users
    ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;

-- Усі вже зареєстровані юзери (включно з демо) — вважаємо верифікованими.
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
