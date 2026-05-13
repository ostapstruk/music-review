# MusicReview

Веб-платформа для рецензування музики з інтеграцією Spotify, fallback-плеєром через Deezer і AI-самарі від Google Gemini. Дипломний проєкт.

**Live:** [https://musicreview.online](https://musicreview.online)

## Що вміє

**Музика та рецензії.** Юзер шукає треки у Spotify прямо з форми "Додати трек", обкладинка/тривалість/audio features підтягуються автоматично. Можна слухати 30-секундний фрагмент — Spotify-preview, або, якщо його нема, Deezer-fallback. На трек пишуться рецензії з оцінкою 1-10, на кожну можна тиснути лайк/дизлайк, а Gemini генерує коротке AI-самарі усіх рецензій під треком (кешується).

**Trending-чарт.** Окрема формула, не просто avg-rating:
```
score = avg_rating × log2(1 + reviews_7d) × time_decay
time_decay = 1 / (1 + days_since_last_review / 7)
```
Тобто свіжий релізний хіт може випереджати золотий стандарт, у якого 10/10 — але остання рецензія була пів року тому.

**Дискусії під рецензіями.** Окремо від самих рецензій є тред відповідей (плоский, без оцінки) — кнопка "Відповіді (N)" розгортає коментарі і одразу підставляє `@автора_рецензії` у поле вводу, можна писати свої. У тексті відповіді підтримуються `@mention`-и (працюють як з латиницею, так і з кирилицею): пишеш `@Остап привіт` — це стає клікабельним посиланням на профіль того юзера. Поруч із кожною репліткою є кнопка "Відповісти", яка вставляє `@юзернейм` цієї репліки в інпут.

**Сповіщення.** Коли тебе згадують у рецензії або відповіді, у navbar зʼявляється дзвоник із червоним лічильником. Окрема сторінка `/notifications` показує перелік. Стани розділені: `is_seen` — для дзвоника (клінається коли відкрив сторінку), `is_read` — для конкретного айтема (клінається коли клацнув). Тобто бейдж зникає одразу, а саме повідомлення лишається підсвіченим, поки ти його не відкриєш.

**Три ролі.**
- `listener` — звичайний користувач. Реєструється, пише рецензії, видаляє тільки свої.
- `artist` — підтверджений артист. Проходить claim-флоу (юзер обирає себе серед артистів → адмін затверджує). Отримує кабінет із кнопкою "Синхронізувати зі Spotify" — підтягує свої топ-треки.
- `admin` — модерує все. Перший зареєстрований юзер автоматично стає адміном. Адмін може давати/знімати права іншим, видаляти треки і рецензії, керувати заявками.

**Модерація треків.** Усі нові треки (від listener-ів і артистів) спершу мають статус `pending`. Адмін у панелі бачить заявки і підтверджує/відхиляє. Якщо додає сам адмін — публікація одразу. Заявки на володіння артистами — окрема вкладка тієї ж панелі.

**Верифікація email.** Реєстрація через 6-значний код, що приходить на пошту через Resend. Код живе 10 хвилин, повторне надсилання — раз на хвилину. Якщо `RESEND_API_KEY` не виставлений (локалка), код друкується у `docker compose logs backend` — зручно для тестів без реального SMTP.

**Самовідновлення плеєра.** Deezer і Spotify URL-и для preview містять CDN-токени, які протухають за кілька днів. Дві захисні мережі:
- Lazy refresh — якщо `<audio>` фейлиться при play, фронт автоматично запитує POST `/tracks/{id}/refresh-preview`, бекенд робить новий Deezer-search і повертає свіжий URL, плеєр ретраїть.
- Background scheduler — фонова asyncio-таска при старті бекенду; кожні 6 годин оновлює пачку з 30 найстаріших треків (за `preview_updated_at`).

**Доступність та теми.** Три теми: темна (default), світла, висока контрастність. Озвучка інтерфейсу (TTS) через `SpeechSynthesisUtterance`. ARIA-labels на ключових інтерактивних елементах. Адаптивна мобільна верстка (тестовано на iPhone Safari).

**Моніторинг.** Prometheus скрейпить `/metrics` бекенду, Grafana малює дашборд з provisioned-конфігом — без ручних налаштувань.

## Стек

| Шар | Технології |
|-----|------------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, PostgreSQL 16, python-jose (JWT), bcrypt, httpx, google-generativeai |
| Frontend | React 18, Vite, react-router-dom, axios, react-icons, react-hot-toast |
| Infra (prod) | Docker Compose, Caddy (HTTPS + reverse-proxy), Resend (transactional email), AWS EC2 |
| Observability | Prometheus, Grafana, prometheus-fastapi-instrumentator |

## Локальний запуск

Потрібен Docker Desktop і Git.

```bash
git clone https://github.com/ostapstruk/music-review.git
cd music-review
```

Створи `.env` у корені:

```env
POSTGRES_USER=musicreview
POSTGRES_PASSWORD=supersecret123
POSTGRES_DB=musicreview_db
POSTGRES_PORT=5432

SECRET_KEY=  # python -c "import secrets; print(secrets.token_urlsafe(64))"

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
GEMINI_API_KEY=

# Опційно. Без ключа код верифікації пишеться у логи бекенду.
RESEND_API_KEY=
EMAIL_FROM=MusicReview <onboarding@resend.dev>
```

Де брати ключі:
- Spotify: https://developer.spotify.com/dashboard
- Gemini: https://aistudio.google.com/apikey
- Resend: https://resend.com → API Keys (опційно)

Підіймай стек:

```bash
docker compose up --build
```

Перший білд займе кілька хвилин. Після запуску:

| Сервіс | URL |
|--------|-----|
| Веб | http://localhost:3000 |
| Swagger UI | http://localhost:8000/docs |
| Метрики | http://localhost:8000/metrics |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (`admin` / `admin`) |

## Демо-користувачі

Свіжа БД одразу містить 4 акаунти для тестування (всі pre-verified):

| Email | Пароль | Роль |
|-------|--------|------|
| `admin@example.com` | `admin123` | Адмін |
| `artist@example.com` | `artist123` | Listener — для тесту claim-флоу |
| `listener@example.com` | `listener123` | Звичайний юзер |
| `critic@example.com` | `critic123` | Звичайний юзер |

Щоб скинути БД до сід-стану: `docker compose down -v && docker compose up --build`.

## Production-деплой (AWS EC2)

В репозиторії є окремий `docker-compose.prod.yml`. Відмінності від звичайного:
- Postgres-порт не виставляється на хост (доступний лише в docker-мережі).
- Frontend бʼє в `/api/v1` як відносний URL — nginx у фронт-контейнері проксить на backend.
- Caddy працює як єдина точка входу на 80/443 і автоматично отримує Let's Encrypt-сертифікат.
- `restart: unless-stopped` на всіх сервісах.

```bash
# На свіжій Ubuntu 22.04+:
sudo apt update && sudo apt install -y git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && exit  # релогін потрібен для групи

git clone https://github.com/ostapstruk/music-review.git
cd music-review
nano .env  # заповнюєш реальними ключами, додаєш RESEND_API_KEY

docker compose -f docker-compose.prod.yml up -d --build
```

Налаштування Caddy для свого домену — у `Caddyfile`. Якщо домен валідно резолвиться на IP сервера, через хвилину сайт буде на `https://yourdomain.online` з валідним сертифікатом.

### Накатка міграцій на існуючу БД

Якщо тягнеш свіжий код на сервер, де БД уже жива (з даними), накотити свіжі міграції:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U musicreview -d musicreview_db \
  < database/migrations/<номер>_<назва>.sql
```

Усі міграції лежать у `database/migrations/`, нумеровані за порядком застосування.

## Структура

```
music-review/
├── backend/                  FastAPI-застосунок
│   ├── app/
│   │   ├── api/v1/           REST-ендпоінти за версією
│   │   ├── core/             config, db engine, безпека, FastAPI deps
│   │   ├── models/           SQLAlchemy 2.0 моделі
│   │   ├── schemas/          Pydantic-схеми (request/response)
│   │   └── services/         бізнес-логіка (auth, track, artist, email, …)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 React + Vite
│   ├── src/
│   │   ├── api/              axios-обгортки на ендпоінти
│   │   ├── components/       UI (ReviewCard, RoleBadge, AudioPlayer, …)
│   │   ├── context/          AuthContext, SpeechContext
│   │   ├── pages/            Login, Register, VerifyEmail, AdminClaims, …
│   │   ├── utils/            timeAgo, renderMentions, usePageTitle
│   │   └── styles/           global.css
│   ├── Dockerfile
│   ├── nginx.conf            проксує /api → backend, віддає статику
│   └── package.json
├── database/
│   ├── init/                 SQL для свіжого контейнера (схема + сід)
│   ├── migrations/           окремі ALTER для апгрейду живої БД
│   └── seeds/                демо-дані
├── monitoring/               Prometheus + Grafana provisioning
├── Caddyfile                 reverse-proxy + Let's Encrypt
├── docker-compose.yml        локалка
├── docker-compose.prod.yml   прод (з Caddy/HTTPS, без public 5432)
└── .env                      секрети (не комітиться)
```

## База даних

16 таблиць, нормалізовано до 3NF. Ключові:

- **Користувачі**: `users`, `email_verifications`
- **Артисти**: `artists` (з полем `claimed_by_user_id`), `artist_claims`, `albums`
- **Треки**: `tracks` (зі статусом модерації, submitter, reviewer), `track_genres`, `genres`
- **Рецензії та обговорення**: `reviews`, `review_likes`, `review_replies`
- **Сповіщення**: `notifications` (з полями `is_read` і `is_seen` для двостанної моделі)
- **Інше**: `badges`, `user_badges`, `user_favorite_tracks`, `ai_summaries`, `activity_feed`

Скрізь Foreign keys з відповідними `ON DELETE` правилами, CHECK-обмеження на ролі/статуси, індекси на критичних колонках.

## API

OpenAPI / Swagger UI доступний за `/docs` локально (`http://localhost:8000/docs`) або в продакшні через `/api/v1/docs`. Основні групи:

| Префікс | Призначення |
|---------|-------------|
| `/api/v1/auth` | login, verify, resend-code |
| `/api/v1/users` | реєстрація, профілі, lookup за username |
| `/api/v1/tracks` | каталог, search, додавання, видалення, refresh-preview |
| `/api/v1/reviews` | рецензії, лайки, відповіді (replies), голоси |
| `/api/v1/artists` | публічні сторінки артистів, claim, /me, sync-tracks |
| `/api/v1/admin` | модерація claim-ів і track-submissions, зміна ролей |
| `/api/v1/notifications` | стрічка сповіщень, lifecycle (seen / read) |
| `/api/v1/genres`, `/ai`, `/activity`, `/stats` | довідники та статистика |

## Ліцензія

MIT — для дипломного й освітнього використання.
