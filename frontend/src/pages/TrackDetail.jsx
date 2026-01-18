import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiDisc, FiClock, FiStar } from 'react-icons/fi';
import { tracksAPI, reviewsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ReviewCard from '../components/ReviewCard';
import ReviewForm from '../components/ReviewForm';
import AISummary from '../components/AISummary';

export default function TrackDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [track, setTrack] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    Promise.all([
      tracksAPI.getById(id),
      reviewsAPI.getForTrack(id),
    ])
      .then(([trackRes, reviewsRes]) => {
        setTrack(trackRes.data);
        setReviews(reviewsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="empty-state">
        <h3>Трек не знайдено</h3>
        <Link to="/">На головну</Link>
      </div>
    );
  }

  // Форматуємо тривалість
  const formatDuration = (ms) => {
    if (!ms) return null;
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Перевіряємо, чи поточний юзер вже написав рецензію
  const hasReviewed = user && reviews.some((r) => r.user_id === user.id);

  const ratingClass =
    track.avg_rating >= 8
      ? 'rating-high'
      : track.avg_rating >= 5
      ? 'rating-mid'
      : 'rating-low';

  return (
    <div className="page track-detail">
      {/* ===== ШАПКА ===== */}
      <div className="track-hero">
        <div className="track-hero-cover">
          {track.cover_url ? (
            <img src={track.cover_url} alt={track.title} />
          ) : (
            <div className="cover-placeholder" style={{ width: 240, height: 240 }}>
              <FiDisc size={64} />
            </div>
          )}
        </div>

        <div className="track-hero-info">
          <h1 className="track-hero-title">{track.title}</h1>
          <p className="track-hero-artist">{track.artist_name}</p>

          <div className="track-meta">
            {formatDuration(track.duration_ms) && (
              <span className="meta-item">
                <FiClock size={14} />
                {formatDuration(track.duration_ms)}
              </span>
            )}
          </div>

          <div className="track-rating-block">
            <span className={`rating-badge rating-big ${ratingClass}`}>
              {track.avg_rating?.toFixed(1) || '—'}
            </span>
            <div className="rating-details">
              <span>{track.reviews_count} рецензій</span>
              <span className="text-muted">
                <FiStar size={12} /> середня оцінка
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== AUDIO FEATURES (радарна діаграма — спрощена версія) ===== */}
      {(track.danceability || track.energy || track.acousticness || track.valence) && (
        <div className="card audio-features">
          <h3 style={{ marginBottom: 16 }}>ДНК музики</h3>
          <div className="features-grid">
            {track.danceability && (
              <FeatureBar label="Танцювальність" value={track.danceability} />
            )}
            {track.energy && (
              <FeatureBar label="Енергія" value={track.energy} />
            )}
            {track.acousticness && (
              <FeatureBar label="Акустичність" value={track.acousticness} />
            )}
            {track.valence && (
              <FeatureBar label="Позитивність" value={track.valence} />
            )}
            {track.tempo && (
              <div className="feature-item">
                <span className="feature-label">Темп</span>
                <span className="feature-value">{Number(track.tempo).toFixed(0)} BPM</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ШІ-САМАРІ ===== */}
      <AISummary trackId={track.id} />

      {/* ===== ФОРМА РЕЦЕНЗІЇ ===== */}
      {user && !hasReviewed && (
        <ReviewForm trackId={track.id} onSubmit={fetchData} />
      )}

      {user && hasReviewed && (
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            ✓ Ви вже оцінили цей трек
          </p>
        </div>
      )}

      {!user && (
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            <Link to="/login">Увійдіть</Link>, щоб залишити рецензію
          </p>
        </div>
      )}

      {/* ===== СПИСОК РЕЦЕНЗІЙ ===== */}
      <div className="reviews-section">
        <h2 className="reviews-title">
          Рецензії ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <div className="empty-state">
            <p>Ще ніхто не залишив рецензію. Будьте першим!</p>
          </div>
        ) : (
          <div className="reviews-list">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onUpdate={fetchData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Допоміжний компонент — горизонтальна шкала audio feature
function FeatureBar({ label, value }) {
  const percent = Math.round(Number(value) * 100);
  return (
    <div className="feature-item">
      <div className="feature-header">
        <span className="feature-label">{label}</span>
        <span className="feature-value">{percent}%</span>
      </div>
      <div className="feature-bar">
        <div
          className="feature-bar-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}