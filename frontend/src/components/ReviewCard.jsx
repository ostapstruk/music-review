import { FiThumbsUp, FiThumbsDown, FiUser, FiVolume2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { reviewsAPI } from '../api/client';
import toast from 'react-hot-toast';

export default function ReviewCard({ review, onUpdate }) {
  const { user } = useAuth();

  const handleLike = async () => {
    if (!user) return toast.error('Увійдіть, щоб голосувати');
    try {
      const res = await reviewsAPI.like(review.id);
      toast.success(
        res.data.status === 'removed' ? 'Голос знято' : 'Лайк!'
      );
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    }
  };

  const handleDislike = async () => {
    if (!user) return toast.error('Увійдіть, щоб голосувати');
    try {
      const res = await reviewsAPI.dislike(review.id);
      toast.success(
        res.data.status === 'removed' ? 'Голос знято' : 'Дизлайк'
      );
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    }
  };

  // TTS — озвучка рецензії
  const handleSpeak = () => {
    if (!review.text) return toast.error('Немає тексту для озвучки');
    
    // Зупиняємо попередню озвучку (якщо була)
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(review.text);
    utterance.lang = 'uk-UA';
    utterance.rate = 0.9; // трохи повільніше для кращого сприйняття
    
    window.speechSynthesis.speak(utterance);
    toast.success('Озвучка запущена');
  };

  const ratingClass =
    review.rating >= 8
      ? 'rating-high'
      : review.rating >= 5
      ? 'rating-mid'
      : 'rating-low';

  return (
    <div className="review-card card">
      <div className="review-header">
        <div className="review-user">
          <FiUser size={16} />
          <span className="review-username">{review.username || 'Анонім'}</span>
        </div>
        <span className={`rating-badge ${ratingClass}`}>
          {review.rating}/10
        </span>
      </div>

      {review.text && <p className="review-text">{review.text}</p>}

      <div className="review-footer">
        <div className="review-actions">
          <button className="vote-btn" onClick={handleLike}>
            <FiThumbsUp size={14} />
            <span>{review.likes_count || 0}</span>
          </button>
          <button className="vote-btn" onClick={handleDislike}>
            <FiThumbsDown size={14} />
            <span>{review.dislikes_count || 0}</span>
          </button>
          {review.text && (
            <button className="vote-btn" onClick={handleSpeak} title="Озвучити рецензію">
              <FiVolume2 size={14} />
            </button>
          )}
        </div>
        <span className="review-date">
          {new Date(review.created_at).toLocaleDateString('uk-UA')}
        </span>
      </div>
    </div>
  );
}