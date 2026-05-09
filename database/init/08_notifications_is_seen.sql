-- =============================================================================
-- Migration 007: Split notification "seen" vs "read"
-- Applied automatically by docker-entrypoint-initdb.d on fresh databases.
-- For existing databases run database/migrations/007_notifications_is_seen.sql.
-- =============================================================================

ALTER TABLE notifications
    ADD COLUMN is_seen BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE notifications SET is_seen = is_read;

CREATE INDEX idx_notifications_seen ON notifications(recipient_id, is_seen);
