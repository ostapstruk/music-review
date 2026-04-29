"""
Email-сервіс через Resend (https://resend.com).

Чому Resend:
- Безкоштовно 100 листів/день, 3000/міс — для дипломки і помірного трафіку вистачає.
- Простий REST API (один POST), не треба SMTP-сервери чи app-passwords.
- Інтегрується за 5 хвилин: реєстрація → API key → готово (+ верифікація домена,
  щоб слати від свого імені).

Поведінка без RESEND_API_KEY:
- Лист НЕ відсилається назовні.
- Замість цього код друкується у stdout — видно у `docker compose logs backend`.
- Це зручно для локальної розробки і як degrade-fallback, якщо Resend не налаштований.
"""

import logging

import httpx

from app.core.config import settings


logger = logging.getLogger(__name__)


RESEND_API_URL = "https://api.resend.com/emails"


class EmailSendError(Exception):
    pass


def _build_verification_html(code: str, username: str) -> str:
    """HTML-тіло листа з кодом верифікації."""
    return f"""\
<!doctype html>
<html lang="uk">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#f4f4f7; padding:24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    <h2 style="margin: 0 0 12px; color:#1a1a1a;">Привіт, {username}!</h2>
    <p style="color:#444; line-height:1.5;">
      Вітаємо у MusicReview. Щоб підтвердити email і завершити реєстрацію, введи код нижче:
    </p>
    <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px;
                text-align:center; background:#f4f4f7; border-radius:8px; padding:18px; margin:24px 0;
                color:#1a1a1a; font-family: 'Courier New', monospace;">
      {code}
    </div>
    <p style="color:#888; font-size: 13px; line-height:1.5;">
      Код дійсний 10 хвилин. Якщо ти не реєструвався — просто проігноруй цей лист.
    </p>
  </div>
</body>
</html>
"""


async def send_verification_email(to_email: str, username: str, code: str) -> None:
    """
    Надсилає лист з 6-значним кодом. Якщо API key не налаштований —
    логуємо код у stdout, щоб флоу можна було тестити локально.
    """
    if not settings.RESEND_API_KEY:
        logger.warning(
            "RESEND_API_KEY is not set — email NOT sent. "
            "Verification code for %s: %s",
            to_email, code,
        )
        # Друкуємо в stdout, щоб у `docker compose logs` точно було видно.
        print(
            f"[email-fallback] Verification code for {to_email}: {code}",
            flush=True,
        )
        return

    payload = {
        "from": settings.EMAIL_FROM,
        "to": [to_email],
        "subject": "Підтвердження email — MusicReview",
        "html": _build_verification_html(code, username),
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json=payload,
            )
            if response.status_code >= 400:
                detail = ""
                try:
                    detail = response.json().get("message", "")
                except Exception:
                    detail = response.text[:300]
                logger.error(
                    "Resend %s: %s (payload to=%s)",
                    response.status_code, detail, to_email,
                )
                # У продакшні не блокуємо реєстрацію через помилку SMTP — кидаємо
                # явну помилку, щоб роутер вирішив, що показувати юзеру.
                raise EmailSendError(detail or f"Resend HTTP {response.status_code}")
    except httpx.HTTPError as e:
        logger.exception("Network error while sending email")
        raise EmailSendError(str(e))
