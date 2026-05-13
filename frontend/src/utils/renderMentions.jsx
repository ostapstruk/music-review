import { Link } from 'react-router-dom';

/**
 * Парсить текст і обертає @username у клікабельне посилання
 * на /u/{username} (там UserRedirect-сторінка резолвить у /users/{id}).
 *
 * Юзернейми у нашій системі — латиниця/кирилиця/цифри/підкреслення
 * (див. UserCreate валідатор). Не зачіпаємо `@example.com` у тексті.
 */
export default function renderMentions(text) {
  if (!text) return null;

  const parts = text.split(/(@[a-zA-Z0-9_Ѐ-ӿԀ-ԯ]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      const username = part.slice(1);
      return (
        <Link key={i} to={`/u/${username}`} className="mention" onClick={(e) => e.stopPropagation()}>
          {part}
        </Link>
      );
    }
    return part;
  });
}
