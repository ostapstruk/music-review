import { FiStar, FiSend } from 'react-icons/fi';
import { reviewsAPI } from '../api/client';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

const RATING_LABELS = {
  1: 'Жахливо',
  2: 'Дуже погано',
  3: 'Погано',
  4: 'Нижче середнього',
  5: 'Нормально',
  6: 'Непогано',
  7: 'Добре',
  8: 'Дуже добре',
  9: 'Чудово',
  10: 'Шедевр',
};

export default function ReviewForm({ trackId, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  // Попередження при спробі покинути сторінку з незбереженим текстом
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (text.trim() || rating > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [text, rating]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return toast.error('Оберіть оцінку');
    setLoading(true);
    try {
      await reviewsAPI.create(trackId, rating, text || null);
      toast.success('Рецензію додано!');
      setRating(0);
      setText('');
      if (onSubmit) onSubmit();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Помилка');
    } finally {
      setLoading(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <form onSubmit={handleSubmit} className="review-form card">
      <h3 className="review-form-title">Ваша оцінка</h3>

      <div className="star-rating">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            className={`star-btn ${n <= activeRating ? 'star-active' : ''}`}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(n)}
            title={RATING_LABELS[n]}
          >
            <FiStar
              size={20}
              fill={n <= activeRating ? 'currentColor' : 'none'}
            />
          </button>
        ))}
        <div className="star-info">
          <span className="star-value">{activeRating || '—'}/10</span>
          {activeRating > 0 && (
            <span className="star-label">{RATING_LABELS[activeRating]}</span>
          )}
        </div>
      </div>

      <div className="textarea-wrapper">
        <textarea
          className="input"
          placeholder="Напишіть відгук (необов'язково)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={5000}
        />
        {text.length > 0 && (
          <span className={"char-counter" + (text.length > 4500 ? " char-warning" : "")}>
            {text.length}/5000
          </span>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || rating === 0}
      >
        <FiSend size={16} />
        {loading ? 'Надсилаємо...' : 'Надіслати рецензію'}
      </button>
    </form>
  );
}