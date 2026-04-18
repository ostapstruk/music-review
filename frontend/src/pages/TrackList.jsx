import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiStar } from 'react-icons/fi';
import { tracksAPI } from '../api/client';

export default function TrackList() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tracksAPI
      .getAll(50)
      .then((res) => setTracks(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <h1 className="page-title">Усі треки</h1>
      <div className="grid grid-3">
        {tracks.map((track) => (
          <Link to={`/tracks/${track.id}`} key={track.id} className="card track-card">
            <div className="track-card-cover">
              {track.cover_url ? (
                <img src={track.cover_url} alt={track.title} />
              ) : (
                <div className="cover-placeholder"><FiStar size={32} /></div>
              )}
            </div>
            <h3 className="track-card-title">{track.title}</h3>
            <p className="track-card-artist">{track.artist_name || 'Unknown'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}