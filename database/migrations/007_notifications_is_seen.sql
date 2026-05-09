-- =============================================================================
-- Migration 007: Split notification "seen" vs "read"
-- Description: is_seen — кількість для дзвоника (клінається на відкриття
-- сторінки списку); is_read — для виділення конкретного айтема (клінається
-- лише коли юзер клацнув по ньому). Це дозволяє показувати "не прочитано"
-- на повідомленні навіть після того, як червона точка зникла з дзвоника.
-- =============================================================================

ALTER TABLE notifications
    ADD COLUMN is_seen BOOLEAN NOT NULL DEFAULT FALSE;

-- Існуючі сповіщення, які вже були is_read=true (тобто юзер їх "переглянув"
-- через попередню логіку), вважаємо одночасно is_seen=true.
UPDATE notifications SET is_seen = is_read;

CREATE INDEX idx_notifications_seen ON notifications(recipient_id, is_seen);
