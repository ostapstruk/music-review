-- =============================================================================
-- Migration 006: Notifications
-- Applied automatically by docker-entrypoint-initdb.d on fresh databases.
-- For existing databases run database/migrations/006_notifications.sql.
-- =============================================================================

CREATE TABLE notifications (
    id            BIGSERIAL PRIMARY KEY,
    recipient_id  BIGINT NOT NULL,
    actor_id      BIGINT,
    type          VARCHAR(30) NOT NULL,
    track_id      BIGINT NOT NULL,
    review_id     BIGINT,
    reply_id      BIGINT,
    source_type   VARCHAR(20) NOT NULL,
    text_snippet  TEXT,
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notif_recipient FOREIGN KEY (recipient_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_actor FOREIGN KEY (actor_id)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_notif_track FOREIGN KEY (track_id)
        REFERENCES tracks(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_review FOREIGN KEY (review_id)
        REFERENCES reviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_reply FOREIGN KEY (reply_id)
        REFERENCES review_replies(id) ON DELETE CASCADE,
    CONSTRAINT notif_type_check CHECK (type IN ('mention')),
    CONSTRAINT notif_source_check CHECK (source_type IN ('review', 'reply'))
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread    ON notifications(recipient_id, is_read);
