import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiCheck,
  FiDisc,
  FiMessageSquare,
  FiRefreshCw,
  FiStar,
  FiTrendingUp,
  FiUser,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { artistsAPI } from '../api/client';
import usePageTitle from '../utils/usePageTitle';

export default function ArtistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  usePageTitle(artist ? `Кабінет: ${artist.name}` : 'Кабінет артиста');

  const loadArtist = () =>
    artistsAPI
      .getMe()
      .then((res) => {
        setArtist(res.data);
        setError(null);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setError('not_claimed');
        } else if (err.response?.status === 403) {
          setError('not_artist');
        } else {
          setError('unknown');
        }
      });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadArtist().finally(() => setLoading(false));
  }, [user]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await artistsAPI.syncMyTracks();
      const { fetched, created, skipped, promoted = 0 } = res.data;
      const parts = [`Знайдено ${fetched} треків`, `додано нових: ${created}`];
      if (promoted > 0) parts.push(`опубліковано раніше pending: ${promoted}`);
      parts.push(`уже були: ${skipped}`);
      toast.success(parts.join('. ') + '.', { duration: 5000 });
      await loadArtist();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Не вдалося синхронізувати');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  if (error === 'not_artist') {
    return (
      <div className="empty-state card" style={{ padding: 40, marginTop: 32 }}>
        <h3>Доступ лише для артистів</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Ця сторінка доступна тільки для підтверджених артистів.
        </p>
      </div>
    );
  }

  if (error === 'not_claimed') {
    return (
      <div className="empty-state card" style={{ padding: 40, marginTop: 32 }}>
        <h3>Сторінку артиста не привʼязано</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          Знайдіть себе у списку артистів і подайте заявку — після підтвердження
          адміністратором цей кабінет стане доступним.
        </p>
        <Link to="/tracks" className="btn btn-primary">До треків</Link>
      </div>
    );
  }

  if (!artist) return null;

  const tracks = artist.tracks || [];
  const totalReviews = tracks.reduce((sum, t) => sum + (t.reviews_count || 0), 0);
  const ratedTracks = tracks.filter((t) => t.avg_rating);
  const avgRating = ratedTracks.length
    ? (ratedTracks.reduce((s, t) => s + t.avg_rating, 0) / ratedTracks.length).toFixed(1)
    : '—';

  return (
    <div className="page artist-dashboard">
      <div className="artist-hero card">
        <div className="artist-hero-cover">
          {artist.image_url ? (
            <img src={artist.image_url} alt={artist.name} />
          ) : (
            <div className="cover-placeholder" style={{ width: 160, height: 160 }}>
              <FiUser size={48} />
            </div>
          )}
        </div>
        <div className="artist-hero-info">
          <div className="artist-hero-title-row">
            <h1 className="artist-hero-name">{artist.name}</h1>
            <span className="role-badge role-badge-artist role-badge-lg" title="Підтверджений артист">
              <FiCheck size={14} />
              <span>Verified</span>
            </span>
          </div>
          {artist.bio && <p className="artist-hero-bio">{artist.bio}</p>}
          <div className="artist-hero-meta">
            {artist.spotify_id ? (
              <span className="meta-item">
                Spotify ID: <code>{artist.spotify_id}</code>
              </span>
            ) : (
              <span className="meta-item text-muted">Без привʼязки до Spotify</span>
            )}
          </div>
          <div className="artist-hero-actions">
            <button
              className="btn btn-primary"
              onClick={handleSync}
              disabled={!artist.spotify_id || syncing}
              title={!artist.spotify_id ? 'У артиста відсутній Spotify ID' : 'Підтягнути топ-10 треків зі Spotify'}
            >
              <FiRefreshCw size={16} className={syncing ? 'spin' : ''} />
              {syncing ? 'Синхронізую…' : 'Синхронізувати зі Spotify'}
            </button>
            <Link to={`/artists/${artist.id}`} className="btn btn-secondary">
              Публічна сторінка
            </Link>
            {artist.claimed_by_user_id && (
              <Link
                to={`/users/${artist.claimed_by_user_id}`}
                className="btn btn-secondary"
                title="Профіль власника цієї сторінки"
              >
                <FiUser size={14} />
                Профіль власника
                {artist.claimed_by_username && ` (@${artist.claimed_by_username})`}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon"><FiDisc size={24} /></div>
          <div className="stat-value">{tracks.length}</div>
          <div className="stat-label">Треків у системі</div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon"><FiMessageSquare size={24} /></div>
          <div className="stat-value">{totalReviews}</div>
          <div className="stat-label">Рецензій усього</div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon"><FiTrendingUp size={24} /></div>
          <div className="stat-value">{avgRating}</div>
          <div className="stat-label">Середня оцінка</div>
        </div>
      </div>

      <h2 className="section-title">Мої треки</h2>
      {tracks.length === 0 ? (
        <div className="empty-state card" style={{ padding: 40 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎙</div>
          <h3>Поки що порожньо</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16, maxWidth: 480, margin: '8px auto 16px' }}>
            Натисніть «Синхронізувати зі Spotify», щоб підтягнути ваші топ-треки автоматично.
          </p>
        </div>
      ) : (
        <div className="grid grid-3">
          {tracks.map((track) => (
            <Link to={`/tracks/${track.id}`} key={track.id} className="card track-card">
              <div className="track-card-cover">
                {track.cover_url ? (
                  <img src={track.cover_url} alt={track.title} />
                ) : (
                  <div className="cover-placeholder"><FiStar size={32} /></div>
                )}
                {track.avg_rating > 0 && (
                  <span className={`cover-rating ${
                    track.avg_rating >= 8 ? 'rating-high' : track.avg_rating >= 5 ? 'rating-mid' : 'rating-low'
                  }`}>
                    {track.avg_rating.toFixed(1)}
                  </span>
                )}
              </div>
              <h3 className="track-card-title">{track.title}</h3>
              <p className="track-card-artist">
                {track.reviews_count || 0} рецензій
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
