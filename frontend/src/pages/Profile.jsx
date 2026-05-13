import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiStar, FiMessageSquare, FiTrendingUp, FiUser, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSpeech } from '../context/SpeechContext';
import { reviewsAPI, authAPI } from '../api/client';
import usePageTitle from '../utils/usePageTitle';
import RoleBadge from '../components/RoleBadge';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { enabled: speechEnabled, rate: speechRate, setRate: setSpeechRate, speakForce } = useSpeech();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  usePageTitle(user ? user.username : 'Профіль');

  const loadReviews = () => {
    if (!user) return;
    return reviewsAPI
      .getForUser(user.id)
      .then((res) => setReviews(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    if (user) {
      loadReviews().finally(() => setLoading(false));
    }
  }, [user]);

  const handleDeleteReview = async (e, reviewId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Видалити цю рецензію?')) return;
    try {
      await reviewsAPI.delete(reviewId);
      toast.success('Рецензію видалено');
      await loadReviews();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    }
  };

  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({ bio, avatar_url: avatarUrl || null });
      toast.success('Профіль оновлено!');
      setEditing(false);
      await refreshUser();
    } catch {
      toast.error('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="empty-state">
        <h3>Ви не авторизовані</h3>
        <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>Увійти</Link>
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  const highestRating = reviews.length > 0
    ? Math.max(...reviews.map(r => r.rating))
    : 0;

  const lowestRating = reviews.length > 0
    ? Math.min(...reviews.map(r => r.rating))
    : 0;

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="profile-header card">
        <div className="profile-avatar">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} className="profile-avatar-img" />
          ) : (
            <FiUser size={48} />
          )}
        </div>
        <div className="profile-info">
          <div className="profile-name-row">
            <h1 className="profile-name">{user.username}</h1>
            <RoleBadge role={user.role} size="lg" />
            {user.is_verified_artist && user.role !== 'artist' && (
              <RoleBadge role="artist" size="lg" />
            )}
          </div>
          <p className="profile-email">{user.email}</p>

          {(user.role === 'artist' || user.is_verified_artist) && (
            <Link to="/artist" className="btn btn-sm btn-secondary" style={{ marginTop: 8, marginRight: 8 }}>
              Кабінет артиста
            </Link>
          )}
          {user.role === 'admin' && (
            <Link to="/admin/claims" className="btn btn-sm btn-secondary" style={{ marginTop: 8, marginRight: 8 }}>
              Заявки артистів
            </Link>
          )}

          {!editing ? (
            <>
              {user.bio && <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>{user.bio}</p>}
              <button className="btn btn-sm btn-secondary" style={{ marginTop: 12 }}
                onClick={() => setEditing(true)}>
                <FiEdit2 size={14} /> Редагувати
              </button>
            </>
          ) : (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="url"
                className="input"
                placeholder="URL аватарки (наприклад, https://...)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
              <textarea className="input" placeholder="Розкажіть про себе..."
                value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Зберігаю...' : 'Зберегти'}
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => setEditing(false)}>
                  Скасувати
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon"><FiMessageSquare size={24} /></div>
          <div className="stat-value">{reviews.length}</div>
          <div className="stat-label">Рецензій написано</div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon"><FiStar size={24} /></div>
          <div className="stat-value">{avgRating}</div>
          <div className="stat-label">Середня оцінка</div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon"><FiTrendingUp size={24} /></div>
          <div className="stat-value">{highestRating > 0 ? lowestRating + '–' + highestRating : '—'}</div>
          <div className="stat-label">Діапазон оцінок</div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginTop: 16, marginBottom: 24 }}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Налаштування озвучки інтерфейсу</h3>
        <p style={{ margin: 0, marginBottom: 16, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Озвучка читає підказки кнопок і посилань голосом. Увімкнути її можна
          через іконку динаміка у верхньому меню.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ minWidth: 140 }}>
            Швидкість голосу: <strong>{speechRate.toFixed(2)}×</strong>
          </label>
          <input
            type="range"
            min="0.7"
            max="1.5"
            step="0.05"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            aria-label="Швидкість голосу диктора"
            style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
          />
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => speakForce('Перевірка швидкості голосу. Якщо вас усе влаштовує — натисніть зберегти.')}
            disabled={!speechEnabled}
            aria-label="Прослухати приклад голосу"
            title={speechEnabled ? 'Прослухати приклад' : 'Спершу увімкніть озвучку у верхньому меню'}
          >
            Перевірити голос
          </button>
        </div>
      </div>

      <h2 className="section-title">Мої рецензії</h2>
      {reviews.length === 0 ? (
        <div className="empty-state card" style={{ padding: 40 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎧</div>
          <h3>Час стати критиком!</h3>
          <p style={{ marginBottom: 16, maxWidth: 400, margin: '8px auto 16px' }}>
            Знайдіть трек, який вас зачепив, і напишіть свою першу рецензію.
            Ваша думка важлива!
          </p>
          <Link to="/tracks" className="btn btn-primary">
            Знайти трек для рецензії
          </Link>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map((r) => (
            <Link to={"/tracks/" + r.track_id} key={r.id} className="card review-profile-item">
              {r.track_cover && (
                <img src={r.track_cover} alt={r.track_title} className="review-profile-cover" />
              )}
              <div className="review-profile-left">
                <strong>{r.track_title || ("Трек #" + r.track_id)}</strong>
                {r.text && <p className="review-text">{r.text}</p>}
              </div>
              <span className={"rating-badge " + (
                r.rating >= 8 ? 'rating-high' : r.rating >= 5 ? 'rating-mid' : 'rating-low'
              )}>
                {r.rating}/10
              </span>
              <button
                className="vote-btn delete-btn review-profile-delete"
                onClick={(e) => handleDeleteReview(e, r.id)}
                title="Видалити рецензію"
                aria-label="Видалити рецензію"
              >
                <FiTrash2 size={14} />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}