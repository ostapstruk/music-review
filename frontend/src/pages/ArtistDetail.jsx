import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiDisc, FiStar } from 'react-icons/fi';
import { artistsAPI } from '../api/client';

export default function ArtistDetail() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    artistsAPI
      .getById(id)
      .then((res) => setArtist(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!artist) return <div className="empty-state"><h3>Артиста не знайдено</h3></div>;

  return (
    <div className="page">
      <div className="artist-header card">
        <div className="artist-avatar-large">
          {artist.image_url ? (
            <img src={artist.image_url} alt={artist.name} />
          ) : (
            <FiDisc size={48} />
          )}
        </div>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{artist.name}</h1>
          <p className="text-muted">
            {artist.tracks_count} треків · {artist.albums_count} альбомів
          </p>
          {artist.bio && <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>{artist.bio}</p>}
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: 24 }}>Треки</h2>
      <div className="grid grid-3">
        {artist.tracks.map((track) => (
          <Link to={`/tracks/${track.id}`} key={track.id} className="card track-card">
            <div className="track-card-cover">
              {track.cover_url ? (
                <img src={track.cover_url} alt={track.title} />
              ) : (
                <div className="cover-placeholder"><FiStar size={32} /></div>
              )}
            </div>
            <h3 className="track-card-title">{track.title}</h3>
            {track.avg_rating > 0 && (
              <span className={`rating-badge ${
                track.avg_rating >= 8 ? 'rating-high' : track.avg_rating >= 5 ? 'rating-mid' : 'rating-low'
              }`} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                {track.avg_rating.toFixed(1)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}