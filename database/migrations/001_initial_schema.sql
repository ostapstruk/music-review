-- =============================================================================
-- Migration 001: Initial Schema
-- Description: Creates all core tables for the music review platform
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Level 1: Tables without foreign keys
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(50) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'listener',
    avatar_url      VARCHAR(500),
    bio             TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT role_check CHECK (role IN ('listener', 'artist', 'admin'))
);

CREATE TABLE artists (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    spotify_id      VARCHAR(50) UNIQUE,
    bio             TEXT,
    image_url       VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE genres (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE badges (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT NOT NULL,
    icon_url        VARCHAR(500),
    tier            VARCHAR(20) NOT NULL DEFAULT 'bronze',
    CONSTRAINT tier_check CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond'))
);

-- -----------------------------------------------------------------------------
-- Level 2: Tables depending on Level 1
-- -----------------------------------------------------------------------------

CREATE TABLE albums (
    id              BIGSERIAL PRIMARY KEY,
    artist_id       BIGINT NOT NULL,
    title           VARCHAR(255) NOT NULL,
    spotify_id      VARCHAR(50) UNIQUE,
    release_year    INTEGER,
    cover_url       VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_album_artist FOREIGN KEY (artist_id)
        REFERENCES artists(id) ON DELETE CASCADE
);

CREATE TABLE user_badges (
    user_id         BIGINT NOT NULL,
    badge_id        BIGINT NOT NULL,
    earned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id),
    CONSTRAINT fk_ub_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ub_badge FOREIGN KEY (badge_id)
        REFERENCES badges(id) ON DELETE CASCADE
);

CREATE TABLE activity_feed (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    action_type     VARCHAR(30) NOT NULL,
    target_type     VARCHAR(30) NOT NULL,
    target_id       BIGINT NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_af_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT action_type_check CHECK (action_type IN (
        'review_posted', 'track_rated', 'badge_earned', 'track_favorited'
    ))
);

-- -----------------------------------------------------------------------------
-- Level 3: Tables depending on Level 2
-- -----------------------------------------------------------------------------

CREATE TABLE tracks (
    id              BIGSERIAL PRIMARY KEY,
    artist_id       BIGINT NOT NULL,
    album_id        BIGINT,
    title           VARCHAR(255) NOT NULL,
    spotify_id      VARCHAR(50) UNIQUE,
    duration_ms     INTEGER,
    cover_url       VARCHAR(500),
    preview_url     VARCHAR(500),
    danceability    NUMERIC(3, 2),
    energy          NUMERIC(3, 2),
    acousticness    NUMERIC(3, 2),
    valence         NUMERIC(3, 2),
    tempo           NUMERIC(5, 2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_track_artist FOREIGN KEY (artist_id)
        REFERENCES artists(id) ON DELETE CASCADE,
    CONSTRAINT fk_track_album FOREIGN KEY (album_id)
        REFERENCES albums(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Level 4: Tables depending on tracks
-- -----------------------------------------------------------------------------

CREATE TABLE reviews (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    track_id        BIGINT NOT NULL,
    rating          SMALLINT NOT NULL,
    text            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_review_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_track FOREIGN KEY (track_id)
        REFERENCES tracks(id) ON DELETE CASCADE,
    CONSTRAINT rating_range CHECK (rating BETWEEN 1 AND 10),
    CONSTRAINT unique_user_track_review UNIQUE (user_id, track_id)
);

CREATE TABLE track_genres (
    track_id        BIGINT NOT NULL,
    genre_id        BIGINT NOT NULL,
    PRIMARY KEY (track_id, genre_id),
    CONSTRAINT fk_tg_track FOREIGN KEY (track_id)
        REFERENCES tracks(id) ON DELETE CASCADE,
    CONSTRAINT fk_tg_genre FOREIGN KEY (genre_id)
        REFERENCES genres(id) ON DELETE CASCADE
);

CREATE TABLE user_favorite_tracks (
    user_id         BIGINT NOT NULL,
    track_id        BIGINT NOT NULL,
    position        SMALLINT NOT NULL,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, track_id),
    CONSTRAINT fk_uft_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_uft_track FOREIGN KEY (track_id)
        REFERENCES tracks(id) ON DELETE CASCADE,
    CONSTRAINT position_range CHECK (position BETWEEN 1 AND 10),
    CONSTRAINT unique_user_position UNIQUE (user_id, position)
);

CREATE TABLE ai_summaries (
    id              BIGSERIAL PRIMARY KEY,
    track_id        BIGINT NOT NULL UNIQUE,
    summary_text    TEXT NOT NULL,
    reviews_count   INTEGER NOT NULL,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ais_track FOREIGN KEY (track_id)
        REFERENCES tracks(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Level 5: Tables depending on reviews
-- -----------------------------------------------------------------------------

CREATE TABLE review_likes (
    user_id         BIGINT NOT NULL,
    review_id       BIGINT NOT NULL,
    is_like         BOOLEAN NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, review_id),
    CONSTRAINT fk_rl_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rl_review FOREIGN KEY (review_id)
        REFERENCES reviews(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Performance indexes
-- -----------------------------------------------------------------------------

CREATE INDEX idx_reviews_track_id ON reviews(track_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_user_id ON activity_feed(user_id);

CREATE INDEX idx_tracks_artist_id ON tracks(artist_id);
CREATE INDEX idx_tracks_album_id ON tracks(album_id);

CREATE INDEX idx_albums_artist_id ON albums(artist_id);