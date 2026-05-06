-- =============================================================================
-- Migration 005: Review replies
-- Applied automatically by docker-entrypoint-initdb.d on fresh databases.
-- For existing databases run database/migrations/005_review_replies.sql.
-- =============================================================================

CREATE TABLE review_replies (
    id          BIGSERIAL PRIMARY KEY,
    review_id   BIGINT NOT NULL,
    user_id     BIGINT NOT NULL,
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_rr_review FOREIGN KEY (review_id)
        REFERENCES reviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT reply_text_not_empty CHECK (length(trim(text)) > 0)
);

CREATE INDEX idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX idx_review_replies_created_at ON review_replies(created_at);
