import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiStar, FiMessageSquare, FiTrendingUp, FiUser, FiEdit2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { reviewsAPI, authAPI } from '../api/client';
import usePageTitle from '../utils/usePageTitle';

export default function Profile() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  usePageTitle(user ? user.username : 'Профіль');
  
  useEffect(() => {
    if (user) {
      reviewsAPI
        .getForUser(user.id)
        .then((res) => setReviews(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  useEffect(() => {
    if (user) setBio(user.bio || '');
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({ bio });
      toast.success('Профіль оновлено!');
      setEditing(false);
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

  // Статистика
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
      {/* Шапка профілю */}
      <div className="profile-header card">
        <div className="profile-avatar">
          <FiUser size={48} />
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{user.username}</h1>
          <p className="profile-email">{user.email}</p>
          <span className="profile-role">{user.role}</span>

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

      {/* Статистика */}
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
          <div className="stat-value">{highestRating > 0 ? `${lowestRating}–${highestRating}` : '—'}</div>
          <div className="stat-label">Діапазон оцінок</div>
        </div>
      </div>

      {/* Рецензії */}
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}