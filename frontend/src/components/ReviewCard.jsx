import { useState, useEffect } from 'react';
import { FiThumbsUp, FiThumbsDown, FiVolume2, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { reviewsAPI } from '../api/client';
import toast from 'react-hot-toast';
import UserAvatar from './UserAvatar';
import timeAgo from '../utils/timeAgo';

export default function ReviewCard({ review, onUpdate, initialVote = null }) {
  const { user } = useAuth();
  const [userVote, setUserVote] = useState(initialVote);
  
  // Синхронізуємо з initialVote коли він приходить з бекенду
  useEffect(() => {
    if (initialVote !== null) {
      setUserVote(initialVote);
    }
  }, [initialVote]);
  const [likesCount, setLikesCount] = useState(review.likes_count || 0);
  const [dislikesCount, setDislikesCount] = useState(review.dislikes_count || 0);

  const handleLike = async () => {
    if (!user) return toast.error('Увійдіть, щоб голосувати');
    try {
      const res = await reviewsAPI.like(review.id);
      if (res.data.status === 'liked') {
        if (userVote === 'dislike') setDislikesCount((c) => c - 1);
        if (userVote !== 'like') setLikesCount((c) => c + 1);
        setUserVote('like');
      } else if (res.data.status === 'removed') {
        setLikesCount((c) => c - 1);
        setUserVote(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    }
  };

  const handleDislike = async () => {
    if (!user) return toast.error('Увійдіть, щоб голосувати');
    try {
      const res = await reviewsAPI.dislike(review.id);
      if (res.data.status === 'disliked') {
        if (userVote === 'like') setLikesCount((c) => c - 1);
        if (userVote !== 'dislike') setDislikesCount((c) => c + 1);
        setUserVote('dislike');
      } else if (res.data.status === 'removed') {
        setDislikesCount((c) => c - 1);
        setUserVote(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Видалити цю рецензію?')) return;
    try {
      await reviewsAPI.delete(review.id);
      toast.success('Рецензію видалено');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    }
  };

  const handleSpeak = () => {
    if (!review.text) return toast.error('Немає тексту для озвучки');
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(review.text);
    utterance.lang = 'uk-UA';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    toast.success('Озвучка запущена');
  };

  const isOwner = user && user.id === review.user_id;

  const ratingClass =
    review.rating >= 8 ? 'rating-high' : review.rating >= 5 ? 'rating-mid' : 'rating-low';

  return (
    <div className="review-card card">
      <div className="review-header">
        <div className="review-user">
          <UserAvatar username={review.username} size={28} />
          <span className="review-username">{review.username || 'Анонім'}</span>
        </div>
        <span className={`rating-badge ${ratingClass}`}>{review.rating}/10</span>
      </div>

      {review.text && <p className="review-text">{review.text}</p>}

      <div className="review-footer">
        <div className="review-actions">
          <button
            className={`vote-btn ${userVote === 'like' ? 'vote-liked' : ''}`}
            onClick={handleLike}
          >
            <FiThumbsUp size={14} />
            <span>{likesCount}</span>
          </button>
          <button
            className={`vote-btn ${userVote === 'dislike' ? 'vote-disliked' : ''}`}
            onClick={handleDislike}
          >
            <FiThumbsDown size={14} />
            <span>{dislikesCount}</span>
          </button>
          {review.text && (
            <button className="vote-btn" onClick={handleSpeak} title="Озвучити">
              <FiVolume2 size={14} />
            </button>
          )}
          {isOwner && (
            <button className="vote-btn delete-btn" onClick={handleDelete} title="Видалити">
              <FiTrash2 size={14} />
            </button>
          )}
        </div>
        <span
          className="review-date"
          title={new Date(review.created_at).toLocaleString('uk-UA')}
        >
          {timeAgo(review.created_at)}
        </span>
      </div>
    </div>
  );
}