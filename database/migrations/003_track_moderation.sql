-- =============================================================================
-- Migration 003: Track moderation
-- Description: Adds approval workflow for track submissions. Non-admin users
-- create tracks in 'pending' state; admin approves or rejects them.
-- Existing tracks default to 'approved' so the public catalog stays untouched.
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
