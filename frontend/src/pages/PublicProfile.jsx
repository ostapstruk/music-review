import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiStar, FiMessageSquare, FiTrendingUp, FiUser, FiArrowLeft, FiTrash2, FiExternalLink, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { authAPI, reviewsAPI, adminAPI } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../utils/usePageTitle';
import RoleBadge from '../components/RoleBadge';

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  usePageTitle(profile ? profile.username : 'Профіль');

  const loadReviews = () => reviewsAPI.getForUser(id).then((res) => setReviews(res.data));

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

  const isAdmin = currentUser && currentUser.role === 'admin';
  const isSelf = currentUser && profile && currentUser.id === profile.id;
  const targetIsAdmin = profile && profile.role === 'admin';

  const handleRoleChange = async (newRole, label) => {
    if (!window.confirm(`${label} для @${profile.username}?`)) return;
    try {
      const res = await adminAPI.changeUserRole(profile.id, newRole);
      toast.success('Роль оновлено');
      setProfile((p) => ({ ...p, role: res.data.role }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Не вдалося змінити роль');
    }
  };

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
          <div className="profile-name-row">
            <h1 className="profile-name">{profile.username}</h1>
            <RoleBadge role={profile.role} size="lg" />
            {profile.is_verified_artist && profile.role !== 'artist' && (
              <RoleBadge role="artist" size="lg" />
            )}
          </div>
          {profile.bio && (
            <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>{profile.bio}</p>
          )}

          {isAdmin && !isSelf && (
            <div className="profile-admin-actions">
              {!targetIsAdmin ? (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleRoleChange('admin', 'Дати права адміна')}
                  title="Призначити цього юзера адміном"
                >
                  <FiShield size={14} /> Зробити адміном
                </button>
              ) : (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleRoleChange(
                    profile.is_verified_artist ? 'artist' : 'listener',
                    'Зняти права адміна',
                  )}
                  title={
                    profile.is_verified_artist
                      ? 'Понизити до артиста (клейм лишиться)'
                      : 'Понизити до звичайного юзера'
                  }
                >
                  <FiShield size={14} /> Зняти права адміна
                </button>
              )}
            </div>
          )}

          {profile.artist_id && (
            <Link
              to={`/artists/${profile.artist_id}`}
              className="profile-artist-link"
              title="Публічна сторінка артиста"
            >
              {profile.artist_image_url ? (
                <img
                  src={profile.artist_image_url}
                  alt={profile.artist_name}
                  className="profile-artist-thumb"
                />
              ) : (
                <div className="profile-artist-thumb profile-artist-thumb-placeholder">
                  <FiUser size={20} />
                </div>
              )}
              <div className="profile-artist-info">
                <span className="profile-artist-label">Публічна сторінка артиста</span>
                <strong className="profile-artist-name">{profile.artist_name}</strong>
              </div>
              <FiExternalLink size={16} className="profile-artist-arrow" />
            </Link>
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
              {isAdmin && (
                <button
                  className="vote-btn delete-btn review-profile-delete"
                  onClick={(e) => handleDeleteReview(e, r.id)}
                  title="Видалити (адмін)"
                  aria-label="Видалити рецензію (адмін)"
                >
                  <FiTrash2 size={14} />
                </button>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}