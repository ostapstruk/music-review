import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiStar, FiSearch } from 'react-icons/fi';
import { tracksAPI } from '../api/client';
import MiniPlay from '../components/MiniPlay';

const SORT_OPTIONS = [
  { value: 'date', label: 'За датою' },
  { value: 'rating', label: 'За рейтингом' },
  { value: 'reviews', label: 'За кількістю рецензій' },
  { value: 'title', label: 'За назвою' },
];

export default function TrackList() {
  const [tracks, setTracks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tracksAPI
      .getAll(100)
      .then((res) => {
        setTracks(res.data);
        setFiltered(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...tracks];

    // Фільтр пошуку
    const q = search.toLowerCase();
    if (q) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.artist_name && t.artist_name.toLowerCase().includes(q))
      );
    }

    // Сортування
    result.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.avg_rating || 0) - (a.avg_rating || 0);
        case 'reviews':
          return (b.reviews_count || 0) - (a.reviews_count || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default: // date
          return b.id - a.id;
      }
    });

    setFiltered(result);
  }, [search, sortBy, tracks]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <h1 className="page-title">Усі треки</h1>

      <div className="tracks-controls">
        <div className="search-input-wrapper">
          <FiSearch size={18} className="search-icon" />
          <input
            type="text"
            className="input"
            placeholder="Пошук за назвою або артистом..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 42 }}
          />
        </div>

        <div className="sort-buttons">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`btn btn-sm ${sortBy === opt.value ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSortBy(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>Нічого не знайдено</h3>
          <p>Спробуйте інший пошуковий запит</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {filtered.map((track) => (
            <Link to={`/tracks/${track.id}`} key={track.id} className="card track-card">
              <div className="track-card-cover">
                {track.cover_url ? (
                  <img src={track.cover_url} alt={track.title} />
                ) : (
                  <div className="cover-placeholder"><FiStar size={32} /></div>
                )}
                <MiniPlay previewUrl={track.preview_url} />
              </div>
              <h3 className="track-card-title">{track.title}</h3>
              <p className="track-card-artist">{track.artist_name || 'Невідомий'}</p>
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
      )}
    </div>
  );
}