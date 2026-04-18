import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiPlus, FiMusic } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { tracksAPI } from '../api/client';

export default function AddTrack() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null);
  const navigate = useNavigate();

  // --- Вкладки ---
  const [tab, setTab] = useState('spotify');

  // --- Ручна форма ---
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await tracksAPI.searchSpotify(query);
      setResults(res.data);
      if (res.data.length === 0) toast('Нічого не знайдено');
    } catch {
      toast.error('Помилка пошуку Spotify');
    } finally {
      setSearching(false);
    }
  };

  const handleAddSpotify = async (track) => {
    setAdding(track.spotify_id);
    try {
      const res = await tracksAPI.addFromSpotify(track);
      toast.success(`${track.title} додано!`);
      navigate(`/tracks/${res.data.id}`);
    } catch {
      toast.error('Помилка при додаванні');
    } finally {
      setAdding(null);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await tracksAPI.create({
        title,
        artist_name: artistName,
        album_title: albumTitle || null,
        cover_url: coverUrl || null,
      });
      toast.success('Трек додано!');
      navigate(`/tracks/${res.data.id}`);
    } catch {
      toast.error('Помилка');
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '';
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="page">
      <h1 className="page-title">Додати трек</h1>

      {/* Вкладки */}
      <div className="tabs">
        <button
          className={`tab ${tab === 'spotify' ? 'tab-active' : ''}`}
          onClick={() => setTab('spotify')}
        >
          <FiMusic size={16} /> Пошук у Spotify
        </button>
        <button
          className={`tab ${tab === 'manual' ? 'tab-active' : ''}`}
          onClick={() => setTab('manual')}
        >
          <FiPlus size={16} /> Вручну
        </button>
      </div>

      {/* ===== Spotify Tab ===== */}
      {tab === 'spotify' && (
        <>
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              className="input"
              placeholder="Назва треку або артиста..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={searching}>
              <FiSearch size={16} />
              {searching ? 'Шукаю...' : 'Пошук'}
            </button>
          </form>

          <div className="spotify-results">
            {results.map((track) => (
              <div key={track.spotify_id} className="card spotify-result-item">
                <div className="spotify-result-cover">
                  {track.cover_url ? (
                    <img src={track.cover_url} alt={track.title} />
                  ) : (
                    <div className="cover-placeholder"><FiMusic size={20} /></div>
                  )}
                </div>
                <div className="spotify-result-info">
                  <h4>{track.title}</h4>
                  <p>{track.artist_name}</p>
                  <span className="text-muted">
                    {track.album_title} {track.release_year && `· ${track.release_year}`}
                    {track.duration_ms && ` · ${formatDuration(track.duration_ms)}`}
                  </span>
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleAddSpotify(track)}
                  disabled={adding === track.spotify_id}
                >
                  {adding === track.spotify_id ? '...' : <><FiPlus size={14} /> Додати</>}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== Manual Tab ===== */}
      {tab === 'manual' && (
        <div className="auth-page" style={{ paddingTop: 20 }}>
          <div className="auth-card card">
            <form onSubmit={handleManualSubmit} className="auth-form">
              <input type="text" placeholder="Назва треку" className="input"
                value={title} onChange={(e) => setTitle(e.target.value)} required />
              <input type="text" placeholder="Виконавець" className="input"
                value={artistName} onChange={(e) => setArtistName(e.target.value)} required />
              <input type="text" placeholder="Альбом (необов'язково)" className="input"
                value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} />
              <input type="url" placeholder="URL обкладинки" className="input"
                value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}>
                Додати
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}