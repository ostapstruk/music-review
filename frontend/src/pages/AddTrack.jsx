import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tracksAPI } from '../api/client';

export default function AddTrack() {
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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
      toast.error('Помилка при додаванні треку');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-card card">
        <h1 className="auth-title">Додати трек</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="text" placeholder="Назва треку" className="input"
            value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input type="text" placeholder="Виконавець" className="input"
            value={artistName} onChange={(e) => setArtistName(e.target.value)} required />
          <input type="text" placeholder="Альбом (необов'язково)" className="input"
            value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} />
          <input type="url" placeholder="URL обкладинки (необов'язково)" className="input"
            value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Додаємо...' : 'Додати'}
          </button>
        </form>
      </div>
    </div>
  );
}