import { useState, useEffect, useRef } from 'react';
import { FiThumbsUp, FiThumbsDown, FiVolume2, FiTrash2, FiMessageCircle, FiSend, FiChevronDown, FiChevronUp, FiCornerUpLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { reviewsAPI } from '../api/client';
import toast from 'react-hot-toast';
import UserAvatar from './UserAvatar';
import RoleBadge from './RoleBadge';
import timeAgo from '../utils/timeAgo';
import renderMentions from '../utils/renderMentions';
import { Link } from 'react-router-dom';

export default function ReviewCard({ review, onUpdate, initialVote = null }) {
  const { user } = useAuth();
  const [userVote, setUserVote] = useState(initialVote);

  useEffect(() => {
    if (initialVote !== null) {
      setUserVote(initialVote);
    }
  }, [initialVote]);

  const [likesCount, setLikesCount] = useState(review.likes_count || 0);
  const [dislikesCount, setDislikesCount] = useState(review.dislikes_count || 0);

  // Reply state
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replies, setReplies] = useState([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const replyInputRef = useRef(null);

  const mentionUser = (username) => {
    if (!username) return;
    setRepliesOpen(true);
    if (!repliesLoaded) loadReplies();
    setReplyText((current) => {
      const prefix = `@${username} `;
      // Уникаємо подвійних згадок підряд
      if (current.startsWith(prefix)) return current;
      return prefix + (current ? current : '');
    });
    // Фокус на поле, щоб юзер одразу друкував
    setTimeout(() => replyInputRef.current?.focus(), 0);
  };

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

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await reviewsAPI.getReplies(review.id);
      setReplies(res.data);
      setRepliesLoaded(true);
    } catch {
      toast.error('Не вдалося завантажити відповіді');
    } finally {
      setLoadingReplies(false);
    }
  };

  const toggleReplies = () => {
    const next = !repliesOpen;
    setRepliesOpen(next);
    if (next && !repliesLoaded) {
      loadReplies();
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Увійдіть, щоб відповісти');
    const text = replyText.trim();
    if (!text) return;

    setSubmittingReply(true);
    try {
      const res = await reviewsAPI.createReply(review.id, text);
      setReplies((prev) => [...prev, res.data]);
      setReplyText('');
      setRepliesLoaded(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('Видалити цю відповідь?')) return;
    try {
      await reviewsAPI.deleteReply(replyId);
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    }
  };

  const isOwner = user && user.id === review.user_id;
  const isAdmin = user && user.role === 'admin';
  const canDelete = isOwner || isAdmin;

  const ratingClass =
    review.rating >= 8 ? 'rating-high' : review.rating >= 5 ? 'rating-mid' : 'rating-low';

  // Скільки відповідей показувати у кнопці. Якщо завантажено — точна кількість; якщо ні — взагалі без числа.
  const replyCountLabel = repliesLoaded
    ? `Відповіді (${replies.length})`
    : 'Відповіді';

  return (
    <div className="review-card card">
      <div className="review-header">
        <Link to={"/users/" + review.user_id} className="review-user">
          {review.avatar_url ? (
            <img
              src={review.avatar_url}
              alt=""
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <UserAvatar username={review.username} size={28} />
          )}
          <span className="review-username">{review.username || 'Анонім'}</span>
          {review.role && review.role !== 'listener' && (
            <RoleBadge role={review.role} showLabel={false} />
          )}
          {review.is_verified_artist && review.role !== 'artist' && (
            <RoleBadge role="artist" showLabel={false} />
          )}
        </Link>
        <span className={`rating-badge ${ratingClass}`}>{review.rating}/10</span>
      </div>

      {review.text && <p className="review-text">{renderMentions(review.text)}</p>}

      <div className="review-footer">
        <div className="review-actions">
          <button
            className={`vote-btn ${userVote === 'like' ? 'vote-liked' : ''}`}
            onClick={handleLike}
            aria-label={"Лайк: " + likesCount}
          >
            <FiThumbsUp size={14} />
            <span>{likesCount}</span>
          </button>
          <button
            className={`vote-btn ${userVote === 'dislike' ? 'vote-disliked' : ''}`}
            onClick={handleDislike}
            aria-label={"Дизлайк: " + dislikesCount}
          >
            <FiThumbsDown size={14} />
            <span>{dislikesCount}</span>
          </button>
          {review.text && (
            <button className="vote-btn" onClick={handleSpeak} title="Озвучити">
              <FiVolume2 size={14} />
            </button>
          )}
          <button
            className="vote-btn"
            onClick={toggleReplies}
            title="Відповіді"
            aria-expanded={repliesOpen}
          >
            <FiMessageCircle size={14} />
            <span>{replyCountLabel}</span>
            {repliesOpen ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
          </button>
          {canDelete && (
            <button
              className="vote-btn delete-btn"
              onClick={handleDelete}
              title={isOwner ? 'Видалити свою рецензію' : 'Видалити (адмін)'}
            >
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

      {repliesOpen && (
        <div className="replies-thread">
          {loadingReplies && (
            <div className="replies-loading">Завантаження…</div>
          )}

          {repliesLoaded && replies.length === 0 && (
            <div className="replies-empty">Поки що жодної відповіді — будьте першим.</div>
          )}

          {replies.map((reply) => {
            const replyIsOwner = user && user.id === reply.user_id;
            const replyCanDelete = replyIsOwner || isAdmin;
            return (
              <div key={reply.id} className="reply-item">
                <Link to={`/users/${reply.user_id}`} className="reply-avatar">
                  {reply.avatar_url ? (
                    <img
                      src={reply.avatar_url}
                      alt=""
                      style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <UserAvatar username={reply.username} size={24} />
                  )}
                </Link>
                <div className="reply-body">
                  <div className="reply-meta">
                    <Link to={`/users/${reply.user_id}`} className="reply-username">
                      {reply.username || 'Анонім'}
                    </Link>
                    {reply.role && reply.role !== 'listener' && (
                      <RoleBadge role={reply.role} showLabel={false} />
                    )}
                    {reply.is_verified_artist && reply.role !== 'artist' && (
                      <RoleBadge role="artist" showLabel={false} />
                    )}
                    <span
                      className="reply-date"
                      title={new Date(reply.created_at).toLocaleString('uk-UA')}
                    >
                      {timeAgo(reply.created_at)}
                    </span>
                  </div>
                  <p className="reply-text">{renderMentions(reply.text)}</p>
                  {user && reply.username && reply.user_id !== user.id && (
                    <button
                      type="button"
                      className="reply-mention-btn"
                      onClick={() => mentionUser(reply.username)}
                      title={`Відповісти @${reply.username}`}
                    >
                      <FiCornerUpLeft size={12} />
                      Відповісти
                    </button>
                  )}
                </div>
                {replyCanDelete && (
                  <button
                    className="vote-btn delete-btn reply-delete"
                    onClick={() => handleDeleteReply(reply.id)}
                    title={replyIsOwner ? 'Видалити' : 'Видалити (адмін)'}
                  >
                    <FiTrash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {user ? (
            <form onSubmit={handleSubmitReply} className="reply-form">
              <input
                ref={replyInputRef}
                type="text"
                className="input reply-input"
                placeholder="Додати відповідь… можна @username"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={2000}
                disabled={submittingReply}
              />
              <button
                type="submit"
                className="btn btn-sm btn-primary"
                disabled={submittingReply || !replyText.trim()}
                aria-label="Надіслати відповідь"
              >
                <FiSend size={14} />
              </button>
            </form>
          ) : (
            <div className="reply-empty-cta">
              <Link to="/login">Увійдіть</Link>, щоб відповісти.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
