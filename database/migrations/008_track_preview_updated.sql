-- =============================================================================
-- Migration 008: Track preview refresh tracking
-- Description: Зберігаємо час останнього оновлення preview_url, щоб
-- фонова таска знала, які треки треба оновити (Deezer/Spotify CDN-токени
-- у URL-ах живуть кілька годин/днів і потім повертають 403).
-- =============================================================================

ALTER TABLE tracks
    ADD COLUMN preview_updated_at TIMESTAMPTZ;

-- Для існуючих треків ставимо created_at — далі фонова таска їх "освіжить".
UPDATE tracks SET preview_updated_at = created_at;

CREATE INDEX idx_tracks_preview_updated ON tracks(preview_updated_at);
