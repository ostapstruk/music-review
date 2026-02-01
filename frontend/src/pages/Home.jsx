import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiStar, FiAward } from 'react-icons/fi';
import { tracksAPI } from '../api/client';
import ActivityFeed from '../components/ActivityFeed';
import PlatformStats from '../components/PlatformStats';

export default function Home() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tracksAPI
      .getTrending(10)
      .then((res) => setTrending(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  // Трек місяця — перший у trending (найвищий score)
  const trackOfMonth = trending.length > 0 ? trending[0] : null;

  return (
    <div className="page">
      <PlatformStats />
      
      {/* ===== БАНЕР "ТРЕК МІСЯЦЯ" ===== */}
      {trackOfMonth && (
        <Link to={`/tracks/${trackOfMonth.id}`} className="hero-banner">
          <div className="hero-bg"
            style={trackOfMonth.cover_url ? {
              backgroundImage: `url(${trackOfMonth.cover_url})`,
            } : {}}
          />
          <div className="hero-content">
            <span className="hero-label">
              <FiAward size={16} />
              Трек місяця
            </span>
            <h2 className="hero-title">{trackOfMonth.title}</h2>
            <p className="hero-artist">{trackOfMonth.artist_name}</p>
            <div className="hero-stats">
              <span className={`rating-badge ${
                trackOfMonth.avg_rating >= 8 ? 'rating-high' : 
                trackOfMonth.avg_rating >= 5 ? 'rating-mid' : 'rating-low'
              }`}>
                {trackOfMonth.avg_rating?.toFixed(1)}
              </span>
              <span className="hero-reviews">{trackOfMonth.reviews_count} рецензій</span>
            </div>
          </div>
        </Link>
      )}

      {/* ===== ГАРЯЧИЙ ЧАРТ ===== */}
      <h1 className="page-title">
        <FiTrendingUp style={{ verticalAlign: 'middle', marginRight: 10 }} />
        Гарячий чарт
      </h1>

      {trending.length === 0 ? (
       <div className="empty-state card" style={{ padding: 40 }}>
          <h3>Чарт порожній</h3>
          <p style={{ marginBottom: 16 }}>Додайте треки та напишіть рецензії, щоб побачити чарт!</p>
          <Link to="/tracks/new" className="btn btn-primary">Додати перший трек</Link>
        </div>
      ) : (
        <div className="trending-list">
          {trending.map((track, index) => (
            <Link
              to={`/tracks/${track.id}`}
              key={track.id}
              className="card trending-item"
            >
              <span className="trending-rank">#{index + 1}</span>

              <div className="trending-cover">
                {track.cover_url ? (
                  <img src={track.cover_url} alt={track.title} />
                ) : (
                  <div className="cover-placeholder">
                    <FiStar size={24} />
                  </div>
                )}
              </div>

              <div className="trending-info">
                <h3 className="trending-title">{track.title}</h3>
                <p className="trending-artist">{track.artist_name}</p>
              </div>

              <div className="trending-stats">
                <span
                  className={`rating-badge ${
                    track.avg_rating >= 8
                      ? 'rating-high'
                      : track.avg_rating >= 5
                      ? 'rating-mid'
                      : 'rating-low'
                  }`}
                >
                  {track.avg_rating?.toFixed(1) || '—'}
                </span>
                <span className="trending-reviews">
                  {track.reviews_count} рец.
                </span>
              </div>

              <span className="trending-score">
                {track.trending_score?.toFixed(1)}
              </span>
            </Link>
          ))}
        </div>
      )}

      <ActivityFeed />
    </div>
  );
}