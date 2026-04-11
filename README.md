# 🎵 MusicReview

Платформа для рецензування музики з інтеграцією Spotify, Deezer та ШІ-аналізом рецензій через Google Gemini.

Дипломний проєкт.

## ✨ Можливості

- 🔐 Реєстрація та авторизація через JWT
- 🎵 Пошук та додавання треків через Spotify API
- 🔊 Прослуховування 30-секундних фрагментів (Spotify + Deezer fallback)
- ⭐ Рецензії з оцінкою 1-10 та текстом
- 👍 Лайки/дизлайки на рецензіях
- 🤖 ШІ-підсумок рецензій через Google Gemini
- 📊 Trending-чарт з математичною формулою
- 🎨 Три теми: темна, світла, висока контрастність
- 🔉 Озвучка рецензій (TTS)
- 👤 Публічні профілі юзерів зі статистикою
- 📈 Моніторинг через Prometheus + Grafana

## 🏗 Технології

**Бекенд:**
- Python 3.12 + FastAPI
- SQLAlchemy 2.0 + PostgreSQL 16
- JWT (python-jose) + bcrypt
- httpx для HTTP-запитів
- google-generativeai

**Фронтенд:**
- React 18 + Vite
- react-router-dom
- axios
- react-icons
- react-hot-toast

**Інфраструктура:**
- Docker + Docker Compose
- Prometheus (метрики)
- Grafana (дашборди)
- nginx (статика фронтенду)

## 🚀 Запуск проєкту

### Вимоги

- Docker Desktop
- Git

### Швидкий старт

1. Клонуйте репозиторій:

```bash
git clone https://github.com/ostapstruk/music-review.git
cd music-review
```

2. Створіть `.env` у корені проєкту:

```env
# PostgreSQL
POSTGRES_USER=musicreview
POSTGRES_PASSWORD=supersecret123
POSTGRES_DB=musicreview_db
POSTGRES_PORT=5432

# JWT
SECRET_KEY=your_secret_key_here

# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key
```

Як отримати ключі:
- **SECRET_KEY**: згенеруйте через `python -c "import secrets; print(secrets.token_urlsafe(64))"`
- **Spotify**: https://developer.spotify.com/dashboard
- **Gemini**: https://aistudio.google.com/apikey

3. Запустіть всі сервіси:

```bash
docker compose up --build
```

Перший запуск займе кілька хвилин (білд образів).

4. Відкрийте в браузері:

| Сервіс | URL |
|--------|-----|
| Веб-інтерфейс | http://localhost:3000 |
| API документація | http://localhost:8000/docs |
| Метрики | http://localhost:8000/metrics |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin/admin) |

### Зупинка

```bash
docker compose down
```

Дані бази збережуться. Щоб видалити дані:

```bash
docker compose down -v
```

## 📂 Структура проєкту

music-review/
├── backend/              # FastAPI застосунок
│   ├── app/
│   │   ├── api/v1/       # Ендпоінти REST API
│   │   ├── core/         # Конфігурація, БД, безпека
│   │   ├── models/       # SQLAlchemy моделі
│   │   ├── schemas/      # Pydantic схеми
│   │   └── services/     # Бізнес-логіка
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             # React застосунок
│   ├── src/
│   │   ├── api/          # HTTP-клієнт
│   │   ├── components/   # Компоненти UI
│   │   ├── context/      # React Context
│   │   ├── pages/        # Сторінки
│   │   └── styles/       # CSS
│   ├── Dockerfile
│   └── package.json
├── database/
│   ├── init/             # SQL міграції та seed
│   ├── migrations/       # Оригінальні міграції
│   └── seeds/            # Початкові дані
├── monitoring/
│   ├── prometheus.yml
│   └── grafana/          # Конфігурація Grafana
├── docker-compose.yml
└── .env                  # Змінні середовища (не комітиться)

## 🗄 База даних

13 таблиць:
- `users`, `artists`, `albums`, `tracks`, `genres`
- `track_genres`, `reviews`, `review_likes`, `user_favorite_tracks`
- `badges`, `user_badges`, `ai_summaries`, `activity_feed`

Foreign keys, індекси, CHECK-обмеження.

## 📊 API

Повна документація: http://localhost:8000/docs

Основні групи ендпоінтів:
- `/api/v1/auth` — авторизація
- `/api/v1/users` — користувачі
- `/api/v1/tracks` — треки
- `/api/v1/reviews` — рецензії
- `/api/v1/artists` — артисти
- `/api/v1/genres` — жанри
- `/api/v1/ai` — ШІ-самарі
- `/api/v1/activity` — стрічка активності
- `/api/v1/stats` — статистика

## 🎯 Алгоритм Trending
score = avg_rating × log2(1 + recent_reviews_7d) × time_decay
time_decay = 1 / (1 + days_since_last_review / 7)

Враховує: середню оцінку, кількість рецензій за тиждень, свіжість.