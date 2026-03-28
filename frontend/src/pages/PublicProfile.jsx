import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiStar, FiMessageSquare, FiTrendingUp, FiUser, FiArrowLeft } from 'react-icons/fi';
import { authAPI, reviewsAPI } from '../api/client';
import { useNavigate } from 'react-router-dom';
import usePageTitle from '../utils/usePageTitle';

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  usePageTitle(profile ? profile.username : 'Профіль');

  useEffect(() => {
    Promise.all([
      authAPI.getPublicProfile(id),
      reviewsAPI.getForUser(id),
    ])
      .then(([profileRes, reviewsRes]) => {
        setProfile(profileRes.data);
        setReviews(reviewsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!profile) {
    return (
      <div className="empty-state">
        <h3>Юзера не знайдено</h3>
        <Link to="/" className="btn btn-primary">На головну</Link>
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  const highestRating = reviews.length > 0 ? Math.max(...reviews.map(r => r.rating)) : 0;
  const lowestRating = reviews.length > 0 ? Math.min(...reviews.map(r => r.rating)) : 0;

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FiArrowLeft size={18} />
        Назад
      </button>

      <div className="profile-header card">
        <div className="profile-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="profile-avatar-img" />
          ) : (
            <FiUser size={48} />
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{profile.username}</h1>
          <span className="profile-role">{profile.role}</span>
          {profile.bio && (
            <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>{profile.bio}</p>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon"><FiMessageSquare size={24} /></div>
          <div className="stat-value">{reviews.length}</div>
          <div className="stat-label">Рецензій</div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon"><FiStar size={24} /></div>
          <div className="stat-value">{avgRating}</div>
          <div className="stat-label">Середня оцінка</div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon"><FiTrendingUp size={24} /></div>
          <div className="stat-value">
            {highestRating > 0 ? lowestRating + '–' + highestRating : '—'}
          </div>
          <div className="stat-label">Діапазон</div>
        </div>
      </div>

      <h2 className="section-title">Рецензії від {profile.username}</h2>
      {reviews.length === 0 ? (
        <div className="empty-state">
          <p>Цей юзер ще не написав жодної рецензії.</p>
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