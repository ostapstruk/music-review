-- =============================================================================
-- Migration 008: Track preview refresh tracking
-- Applied automatically by docker-entrypoint-initdb.d on fresh databases.
-- For existing databases run database/migrations/008_track_preview_updated.sql.
-- =============================================================================

ALTER TABLE tracks
    ADD COLUMN preview_updated_at TIMESTAMPTZ;

UPDATE tracks SET preview_updated_at = created_at;

CREATE INDEX idx_tracks_preview_updated ON tracks(preview_updated_at);
