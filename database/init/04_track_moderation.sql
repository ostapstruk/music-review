-- =============================================================================
-- Migration 003: Track moderation
-- Applied automatically by docker-entrypoint-initdb.d on fresh databases.
-- For existing databases, run database/migrations/003_track_moderation.sql.
-- =============================================================================

ALTER TABLE tracks
    ADD COLUMN status      VARCHAR(20)  NOT NULL DEFAULT 'approved',
    ADD COLUMN submitted_by BIGINT,
    ADD COLUMN reviewed_at  TIMESTAMPTZ,
    ADD COLUMN reviewed_by  BIGINT,
    ADD CONSTRAINT track_status_check
        CHECK (status IN ('pending', 'approved', 'rejected')),
    ADD CONSTRAINT fk_track_submitter
        FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_track_reviewer
        FOREIGN KEY (reviewed_by)  REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_tracks_status        ON tracks(status);
CREATE INDEX idx_tracks_submitted_by  ON tracks(submitted_by);
