import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiDisc, FiClock, FiStar, FiArrowLeft, FiShare2, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { tracksAPI, reviewsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ReviewCard from '../components/ReviewCard';
import ReviewForm from '../components/ReviewForm';
import AISummary from '../components/AISummary';
import RatingHistogram from '../components/RatingHistogram';
import AudioPlayer from '../components/AudioPlayer';
import AnimatedNumber from '../components/AnimatedNumber';
import usePageTitle from '../utils/usePageTitle';

export default function TrackDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [track, setTrack] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [myVotes, setMyVotes] = useState({});
  const [loading, setLoading] = useState(true);

  usePageTitle(track ? track.title : 'Трек');

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

    if (user) {
      reviewsAPI.getMyVotes(id)
        .then((res) => setMyVotes(res.data))
        .catch(() => {});
    }
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

  const formatDuration = (ms) => {
    if (!ms) return null;
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const hasReviewed = user && reviews.some((r) => r.user_id === user.id);

  const ratingClass =
    track.avg_rating >= 8
      ? 'rating-high'
      : track.avg_rating >= 5
      ? 'rating-mid'
      : 'rating-low';

  return (
    <div className="page track-detail">
      <div className="track-toolbar">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft size={18} />
          Назад
        </button>
        <div className="track-toolbar-right">
          {track.spotify_id && (
            <SpotifyLink spotifyId={track.spotify_id} />
          )}
          <button className="back-btn" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Посилання скопійовано!');
          }}>
            <FiShare2 size={16} />
            Поділитися
          </button>
        </div>
      </div>

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
          <Link to={"/artists/" + track.artist_id} className="track-hero-artist">
            {track.artist_name}
          </Link>

          <div className="track-meta">
            {formatDuration(track.duration_ms) && (
              <span className="meta-item">
                <FiClock size={14} />
                {formatDuration(track.duration_ms)}
              </span>
            )}
          </div>

          <div className="track-rating-block">
            <span className={"rating-badge rating-big " + ratingClass}>
              <AnimatedNumber value={track.avg_rating} />
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

      <AudioPlayer previewUrl={track.preview_url} title={track.title} />

      <RatingHistogram trackId={track.id} />

      <AISummary trackId={track.id} />

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

      <ReviewsSection reviews={reviews} onUpdate={fetchData} myVotes={myVotes} />
    </div>
  );
}

function SpotifyLink({ spotifyId }) {
  var url = "https://open.spotify.com/track/" + spotifyId;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="back-btn spotify-link">
      <FiExternalLink size={16} />
      Spotify
    </a>
  );
}

function ReviewsSection({ reviews, onUpdate, myVotes }) {
  const [showAll, setShowAll] = useState(false);
  var INITIAL_COUNT = 5;

  var visible = showAll ? reviews : reviews.slice(0, INITIAL_COUNT);
  var hasMore = reviews.length > INITIAL_COUNT;

  return (
    <div className="reviews-section">
      <h2 className="reviews-title">
        Рецензії ({reviews.length})
      </h2>
      {reviews.length === 0 ? (
        <div className="empty-state">
          <p>Ще ніхто не залишив рецензію. Будьте першим!</p>
        </div>
      ) : (
        <>
          <div className="reviews-list">
            {visible.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onUpdate={onUpdate}
                initialVote={myVotes[String(review.id)] || null}
              />
            ))}
          </div>
          {hasMore && !showAll && (
            <button
              className="btn btn-secondary show-more-btn"
              onClick={() => setShowAll(true)}
            >
              Показати ще ({reviews.length - INITIAL_COUNT})
            </button>
          )}
        </>
      )}
    </div>
  );
}

function FeatureBar({ label, value }) {
  var percent = Math.round(Number(value) * 100);
  return (
    <div className="feature-item">
      <div className="feature-header">
        <span className="feature-label">{label}</span>
        <span className="feature-value">{percent}%</span>
      </div>
      <div className="feature-bar">
        <div
          className="feature-bar-fill"
          style={{ width: percent + "%" }}
        />
      </div>
    </div>
  );
}