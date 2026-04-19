import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiStar, FiMessageSquare, FiTrendingUp, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { reviewsAPI } from '../api/client';

export default function Profile() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      reviewsAPI
        .getForUser(user.id)
        .then((res) => setReviews(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

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
        <div className="empty-state">
          <p>Ви ще не написали жодної рецензії.</p>
          <Link to="/tracks" className="btn btn-primary" style={{ marginTop: 12 }}>
            Переглянути треки
          </Link>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map((r) => (
            <Link to={`/tracks/${r.track_id}`} key={r.id} className="card review-profile-item">
              <div className="review-profile-left">
                <strong>Трек #{r.track_id}</strong>
                {r.text && <p className="review-text">{r.text}</p>}
              </div>
              <span className={`rating-badge ${
                r.rating >= 8 ? 'rating-high' : r.rating >= 5 ? 'rating-mid' : 'rating-low'
              }`}>
                {r.rating}/10
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}