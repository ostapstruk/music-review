import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { tracksAPI } from '../api/client';

export default function TrackDetail() {
  const { id } = useParams();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tracksAPI
      .getById(id)
      .then((res) => setTrack(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!track) return <div className="empty-state"><h3>Трек не знайдено</h3></div>;

  return (
    <div className="page">
      <h1 className="page-title">{track.title}</h1>
      <p className="page-subtitle">{track.artist_name}</p>
      <p>Рейтинг: {track.avg_rating?.toFixed(1) || '—'} ({track.reviews_count} рецензій)</p>
    </div>
  );
}