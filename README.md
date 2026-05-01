# 🎵 MusicReview

Платформа для рецензування музики з інтеграцією Spotify, Deezer та ШІ-аналізом рецензій через Google Gemini.

**Live demo:** [https://musicreview.online](https://musicreview.online)

Дипломний проєкт.

## ✨ Можливості

### Контент
- 🎵 Пошук та додавання треків через Spotify API
- 🔊 Прослуховування 30-секундних фрагментів (Spotify + Deezer fallback)
- ⭐ Рецензії з оцінкою 1-10 та текстом
- 👍 Лайки/дизлайки на рецензіях
- 🤖 ШІ-підсумок рецензій через Google Gemini
- 📊 Trending-чарт з математичною формулою

### Користувачі та ролі
- 🔐 Реєстрація з **верифікацією email через 6-значний код** (Resend)
- 🎟 Авторизація через JWT
- 👤 Три ролі: **listener** (звичайний користувач), **artist** (підтверджений артист), **admin**
- ✓ Перший зареєстрований користувач автоматично стає адміном
- 🛡 Адмін може давати/знімати права адміна іншим юзерам прямо з UI

### Артисти
- 🎙 Юзер може подати **заявку на володіння артистом** (claim-флоу)
- 📋 Адмін підтверджує/відхиляє заявку у адмін-панелі
- 🎚 Підтверджений артист отримує **кабінет** із кнопкою синхронізації топ-треків зі Spotify
- 🔗 На сторінці артиста — посилання на профіль власника, на профілі — посилання на сторінку артиста

### Модерація
- 🔍 **Усі нові треки** від listener-ів і артистів проходять модерацію в адмін-панелі
- ✅ Адмін підтверджує / відхиляє кожен трек
- 🚫 Адмін може видаляти будь-які треки і будь-які рецензії
- 📥 Адмін має панель з двома вкладками: "Заявки на володіння артистом" і "Заявки на додавання трека"

### Доступність
- 🎨 Три теми: темна, світла, висока контрастність
- 🔉 Озвучка рецензій та інтерфейсу (TTS)
- ♿ ARIA-labels на ключових елементах

### Інфраструктура
- 📈 Моніторинг через Prometheus + Grafana
- 🌐 Production-деплой на AWS EC2 з HTTPS (Caddy + Let's Encrypt)
- 📧 Транзакційні листи через Resend

## 🏗 Технології

**Бекенд:**
- Python 3.12 + FastAPI
- SQLAlchemy 2.0 + PostgreSQL 16
- JWT (python-jose) + bcrypt
- httpx для зовнішніх HTTP-запитів
- google-generativeai (Gemini)
- Resend HTTP API (email)

**Фронтенд:**
- React 18 + Vite
- react-router-dom
- axios
- react-icons
- react-hot-toast

**Інфраструктура:**
- Docker + Docker Compose
- Caddy (reverse-proxy + автоматичний TLS у production)
- Prometheus (метрики)
- Grafana (дашборди)
- nginx (статика фронтенду + проксі на бекенд)

## 🚀 Локальний запуск

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

# Resend (email верифікація). Якщо порожньо — код друкується у логах backend.
RESEND_API_KEY=
EMAIL_FROM=MusicReview <onboarding@resend.dev>
```

Як отримати ключі:
- **SECRET_KEY**: `python -c "import secrets; print(secrets.token_urlsafe(64))"`
- **Spotify**: https://developer.spotify.com/dashboard
- **Gemini**: https://aistudio.google.com/apikey
- **Resend** (опційно для локалу): https://resend.com → API Keys

3. Запустіть усі сервіси:

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

### 🧑‍🚀 Демо-користувачі

База ініціалізується з 4 демо-юзерами для зручного тестування:

| Email | Пароль | Роль |
|-------|--------|------|
| `admin@example.com` | `admin123` | Адмін |
| `artist@example.com` | `artist123` | Listener (для тесту artist claim-флоу) |
| `listener@example.com` | `listener123` | Звичайний юзер |
| `critic@example.com` | `critic123` | Звичайний юзер |

> Демо-юзери одразу мають `is_verified=true` і не потребують підтвердження email.

### Зупинка

```bash
docker compose down
```

Дані БД збережуться. Щоб скинути все начисто:

```bash
docker compose down -v
```

## ☁️ Production деплой (AWS EC2)

Використовується окремий compose-файл `docker-compose.prod.yml`:
- Postgres-порт **не виставляється назовні** (доступний тільки в docker-network)
- Frontend бʼє в `/api/v1` через nginx-проксі (відносний URL)
- **Caddy** як reverse-proxy на 80/443 з автоматичним Let's Encrypt
- На сервісах `restart: unless-stopped`

### Запуск на VPS

```bash
# На свіжій Ubuntu 22.04+
sudo apt update && sudo apt install -y git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && exit  # релогін

# Знов SSH
git clone https://github.com/ostapstruk/music-review.git
cd music-review

# .env з реальними ключами і доменом
nano .env
# додатково для Caddy:
# DOMAIN=yourdomain.online
# ACME_EMAIL=you@gmail.com

docker compose -f docker-compose.prod.yml up -d --build
```

Caddy автоматично отримає сертифікат для домену з `Caddyfile`.

### Накатка міграцій на існуючу БД

Якщо зливаєш свіжу версію коду, а БД вже є — накатимо міграції руками:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U musicreview -d musicreview_db \
  < database/migrations/<номер>_<назва>.sql
```

Список усіх міграцій — у `database/migrations/`.

## 📂 Структура проєкту

```
music-review/
├── backend/                  # FastAPI застосунок
│   ├── app/
│   │   ├── api/v1/           # Ендпоінти REST API
│   │   ├── core/             # Конфігурація, БД, безпека, deps
│   │   ├── models/           # SQLAlchemy моделі
│   │   ├── schemas/          # Pydantic схеми
│   │   └── services/         # Бізнес-логіка (auth, tracks, artist, email, ...)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # React застосунок
│   ├── src/
│   │   ├── api/              # HTTP-клієнт
│   │   ├── components/       # Компоненти UI (RoleBadge, ReviewCard, ...)
│   │   ├── context/          # AuthContext, SpeechContext
│   │   ├── pages/            # Сторінки (Login, VerifyEmail, AdminClaims, ArtistDashboard...)
│   │   └── styles/           # CSS
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── database/
│   ├── init/                 # SQL для першого запуску (схема + сід)
│   ├── migrations/           # Окремі міграції для існуючих БД
│   └── seeds/                # Демо-дані
├── monitoring/
│   ├── prometheus.yml
│   └── grafana/
├── Caddyfile                 # Reverse-proxy для prod
├── docker-compose.yml        # Локальний запуск
├── docker-compose.prod.yml   # Production (з Caddy/HTTPS)
└── .env                      # Секрети (не комітиться)
```

## 🗄 База даних

15 таблиць:
- **Користувачі та ролі**: `users`, `email_verifications`
- **Артисти**: `artists`, `artist_claims`, `albums`
- **Треки**: `tracks` (зі статусом модерації), `track_genres`, `genres`
- **Рецензії**: `reviews`, `review_likes`
- **Інше**: `badges`, `user_badges`, `user_favorite_tracks`, `ai_summaries`, `activity_feed`

Foreign keys, індекси, CHECK-обмеження на ролі/статуси.

## 📊 API

Повна документація: `https://musicreview.online/api/v1` → Swagger UI на `/docs` локально.

Основні групи:
- `/api/v1/auth` — login, verify, resend-code
- `/api/v1/users` — реєстрація, профілі
- `/api/v1/tracks` — каталог + модерація
- `/api/v1/reviews` — рецензії, лайки
- `/api/v1/artists` — публічні сторінки + claim, sync, кабінет
- `/api/v1/admin` — модерація заявок (артистів і треків), управління ролями
- `/api/v1/genres`, `/api/v1/ai`, `/api/v1/activity`, `/api/v1/stats`

## 🎯 Алгоритм Trending

```
score = avg_rating × log2(1 + recent_reviews_7d) × time_decay
time_decay = 1 / (1 + days_since_last_review / 7)
```

Враховує: середню оцінку, кількість рецензій за тиждень, свіжість.

## 🔐 Email-верифікація

При реєстрації:
1. Юзер створюється у статусі `is_verified=false`.
2. Бекенд генерує 6-значний код (TTL 10 хв) і шле через Resend HTTP API.
3. Юзер вводить код на `/verify-email` → автоматично логіниться (видається JWT).
4. Якщо код прострочений — кнопка "Надіслати ще раз" (rate-limit 60 с).
5. Якщо `RESEND_API_KEY` порожній — лист не відправляється, код друкується у `docker compose logs backend` (для локалу).

## 🎯 Модерація треків

Будь-який не-адмін юзер, що додає трек:
1. Створюється запис у `tracks` зі `status='pending'`.
2. Трек **не зʼявляється у каталозі** до підтвердження.
3. Автору і адміну він видимий зі спеціальним банером "На модерації".
4. Адмін у адмін-панелі (вкладка "Заявки на додавання трека") підтверджує або відхиляє.
5. При підтвердженні `status='approved'`, трек публічний.

Адмін додає треки одразу як `approved`.

## 📜 Ліцензія

MIT — для дипломного/освітнього використання.
