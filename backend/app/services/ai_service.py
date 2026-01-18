import google.generativeai as genai
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Review, Track, User

# Таблиця ai_summaries — працюємо через сирий SQL,
# бо модель не створювали (таблиця вже є в БД з міграції)
from sqlalchemy import text as sql_text


def _configure_gemini():
    """Ініціалізує Gemini API."""
    if not settings.GEMINI_API_KEY:
        return None
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-2.5-flash")


def get_ai_summary(db: Session, track_id: int) -> dict | None:
    """
    Повертає ШІ-самарі для треку.
    
    Логіка:
    1. Перевіряє кеш (таблиця ai_summaries).
    2. Якщо кеш є і кількість рецензій не змінилась — повертає кеш.
    3. Якщо кешу немає або додались нові рецензії — генерує нове самарі.
    4. Мінімум 3 рецензії для генерації (інакше немає сенсу).
    """
    # Скільки рецензій зараз
    reviews_data = _get_reviews_texts(db, track_id)
    
    if len(reviews_data) < 3:
        return None  # Замало рецензій для змістовного самарі
    
    # Перевіряємо кеш
    cached = db.execute(
        sql_text("SELECT summary_text, reviews_count FROM ai_summaries WHERE track_id = :tid"),
        {"tid": track_id},
    ).first()
    
    if cached and cached.reviews_count >= len(reviews_data):
        # Кеш актуальний — повертаємо
        return {
            "summary": cached.summary_text,
            "reviews_count": cached.reviews_count,
            "is_cached": True,
        }
    
    # Генеруємо нове самарі
    model = _configure_gemini()
    if model is None:
        return None
    
    # Отримуємо назву треку
    track = db.execute(
        select(Track).where(Track.id == track_id)
    ).scalar_one_or_none()
    
    if track is None:
        return None
    
    summary_text = _generate_summary(model, track.title, reviews_data)
    
    if summary_text is None:
        return None
    
    # Зберігаємо в кеш (upsert)
    if cached:
        db.execute(
            sql_text("""
                UPDATE ai_summaries 
                SET summary_text = :text, reviews_count = :count, generated_at = NOW()
                WHERE track_id = :tid
            """),
            {"text": summary_text, "count": len(reviews_data), "tid": track_id},
        )
    else:
        db.execute(
            sql_text("""
                INSERT INTO ai_summaries (track_id, summary_text, reviews_count)
                VALUES (:tid, :text, :count)
            """),
            {"tid": track_id, "text": summary_text, "count": len(reviews_data)},
        )
    
    db.commit()
    
    return {
        "summary": summary_text,
        "reviews_count": len(reviews_data),
        "is_cached": False,
    }


def _get_reviews_texts(db: Session, track_id: int) -> list[dict]:
    """Збирає тексти рецензій для треку."""
    stmt = (
        select(Review.rating, Review.text, User.username)
        .join(User, Review.user_id == User.id)
        .where(Review.track_id == track_id)
        .order_by(Review.created_at.desc())
        .limit(50)  # Обмежуємо, щоб не перевищити ліміт токенів
    )
    
    rows = db.execute(stmt).all()
    
    return [
        {"rating": r.rating, "text": r.text or "", "username": r.username}
        for r in rows
    ]


def _generate_summary(model, track_title: str, reviews: list[dict]) -> str | None:
    """Генерує самарі через Gemini API."""
    
    # Формуємо текст рецензій для промпту
    reviews_text = ""
    for r in reviews:
        text_part = f" — {r['text']}" if r['text'] else ""
        reviews_text += f"- {r['username']} ({r['rating']}/10){text_part}\n"
    
    prompt = f"""Ти — музичний критик-аналітик. Проаналізуй рецензії на трек "{track_title}" 
і напиши один стислий абзац (3-5 речень) українською мовою, що підсумовує думку слухачів.

Вкажи:
- Загальне враження (позитивне/змішане/негативне)
- Що хвалять найбільше
- Що критикують (якщо є)
- Загальний настрій спільноти

Рецензії:
{reviews_text}

Відповідай ТІЛЬКИ підсумком, без вступних фраз типу "Ось підсумок:" чи "Аналіз рецензій:".
Пиши від третьої особи ("слухачі вважають", "спільнота відзначає")."""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API error: {e}")
        return None