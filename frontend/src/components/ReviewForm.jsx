import { useState } from 'react';
import { FiStar, FiSend } from 'react-icons/fi';
import { reviewsAPI } from '../api/client';
import toast from 'react-hot-toast';

export default function ReviewForm({ trackId, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <form onSubmit={handleSubmit} className="review-form card">
      <h3 className="review-form-title">Ваша оцінка</h3>

      <div className="star-rating">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            className={`star-btn ${
              n <= (hoverRating || rating) ? 'star-active' : ''
            }`}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(n)}
          >
            <FiStar
              size={20}
              fill={n <= (hoverRating || rating) ? 'currentColor' : 'none'}
            />
          </button>
        ))}
        <span className="star-value">
          {hoverRating || rating || '—'}/10
        </span>
      </div>

      <textarea
        className="input"
        placeholder="Напишіть відгук (необов'язково)..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />

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