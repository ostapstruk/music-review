-- =============================================================================
-- Seed 001: Initial reference data
-- Description: Populates genres and badges catalogs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Genres
-- -----------------------------------------------------------------------------

INSERT INTO genres (name, slug) VALUES
    ('Rock', 'rock'),
    ('Pop', 'pop'),
    ('Hip-Hop', 'hip-hop'),
    ('Electronic', 'electronic'),
    ('R&B', 'rnb'),
    ('Jazz', 'jazz'),
    ('Classical', 'classical'),
    ('Metal', 'metal'),
    ('Indie', 'indie'),
    ('Country', 'country'),
    ('Folk', 'folk'),
    ('Reggae', 'reggae'),
    ('Blues', 'blues'),
    ('Punk', 'punk'),
    ('Alternative', 'alternative');

-- -----------------------------------------------------------------------------
-- Badges
-- -----------------------------------------------------------------------------

INSERT INTO badges (code, name, description, tier) VALUES
    ('newbie',            'Новачок',            'Написав першу рецензію',                          'bronze'),
    ('melomaniac',        'Меломан',            'Оцінив 50 треків',                                 'silver'),
    ('prolific_reviewer', 'Плідний критик',     'Написав 25 розгорнутих рецензій',                  'silver'),
    ('strict_critic',     'Суворий критик',     'Поставив 10 оцінок нижче 4 балів',                 'gold'),
    ('generous_soul',     'Щедра душа',         'Поставив 10 оцінок вище 8 балів',                  'gold'),
    ('trendsetter',       'Законодавець',       'Рецензія отримала 50 лайків',                     'gold'),
    ('rock_ambassador',   'Амбасадор року',     'Оцінив 50 треків у жанрі Rock',                    'diamond'),
    ('pop_ambassador',    'Амбасадор попу',     'Оцінив 50 треків у жанрі Pop',                     'diamond'),
    ('hiphop_ambassador', 'Амбасадор хіп-хопу', 'Оцінив 50 треків у жанрі Hip-Hop',                 'diamond'),
    ('early_bird',        'Рання пташка',       'Одним з перших оцінив свіжий реліз',              'silver');