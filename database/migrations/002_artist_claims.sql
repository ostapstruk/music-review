-- =============================================================================
-- Migration 002: Artist claims
-- Description: Adds the artist-claim flow so a user can be linked to an artist
-- record. A claim is created by the user and approved by an admin.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- artists: link to the user who owns this artist page (after admin approval)
-- -----------------------------------------------------------------------------

ALTER TABLE artists
    ADD COLUMN claimed_by_user_id BIGINT NULL UNIQUE,
    ADD CONSTRAINT fk_artist_claimed_by FOREIGN KEY (claimed_by_user_id)
        REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- artist_claims: requests by users to be recognized as a given artist
-- -----------------------------------------------------------------------------

CREATE TABLE artist_claims (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    artist_id       BIGINT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    message         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ,
    reviewed_by     BIGINT,
    CONSTRAINT fk_claim_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_artist FOREIGN KEY (artist_id)
        REFERENCES artists(id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_reviewer FOREIGN KEY (reviewed_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT claim_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT unique_user_artist_claim UNIQUE (user_id, artist_id)
);

CREATE INDEX idx_artist_claims_status ON artist_claims(status);
CREATE INDEX idx_artist_claims_user_id ON artist_claims(user_id);
CREATE INDEX idx_artist_claims_artist_id ON artist_claims(artist_id);
