import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiDisc, FiStar, FiCheck, FiSend, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { artistsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../utils/usePageTitle';

export default function ArtistDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claiming, setClaiming] = useState(false);

  usePageTitle(artist ? artist.name : 'Артист');

  useEffect(() => {
    artistsAPI
      .getById(id)
      .then((res) => setArtist(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!artist) return <div className="empty-state"><h3>Артиста не знайдено</h3></div>;

  const isClaimed = !!artist.claimed_by_user_id;
  const canClaim = user && !isClaimed && user.role !== 'admin';

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await artistsAPI.claim(artist.id, claimMessage.trim() || null);
      toast.success('Заявку надіслано! Адмін перегляне її найближчим часом.');
      setShowClaimForm(false);
      setClaimMessage('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Не вдалося подати заявку');
    } finally {
      setClaiming(false);
    }
  };

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
        <div style={{ flex: 1 }}>
          <div className="profile-name-row">
            <h1 className="page-title" style={{ marginBottom: 4 }}>{artist.name}</h1>
            {isClaimed && (
              <span
                className="role-badge role-badge-artist role-badge-lg"
                title="Сторінкою керує підтверджений артист"
              >
                <FiCheck size={14} />
                <span>Verified</span>
              </span>
            )}
          </div>
          <p className="text-muted">
            {artist.tracks_count} треків · {artist.albums_count} альбомів
          </p>
          {artist.bio && <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>{artist.bio}</p>}

          {isClaimed && artist.claimed_by_user_id && (
            <Link
              to={`/users/${artist.claimed_by_user_id}`}
              className="btn btn-sm btn-secondary"
              style={{ marginTop: 12, marginRight: 8 }}
              title="Перейти до профілю власника"
            >
              <FiUser size={14} />
              Профіль власника
              {artist.claimed_by_username && ` (@${artist.claimed_by_username})`}
            </Link>
          )}

          {canClaim && !showClaimForm && (
            <button
              className="btn btn-sm btn-secondary"
              style={{ marginTop: 12 }}
              onClick={() => setShowClaimForm(true)}
            >
              Це я — подати заявку
            </button>
          )}

          {showClaimForm && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
              <textarea
                className="input"
                placeholder="Кілька слів для адміна (опційно)"
                value={claimMessage}
                onChange={(e) => setClaimMessage(e.target.value)}
                rows={3}
                maxLength={2000}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-primary" onClick={handleClaim} disabled={claiming}>
                  <FiSend size={14} /> {claiming ? 'Відправляю…' : 'Надіслати заявку'}
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => { setShowClaimForm(false); setClaimMessage(''); }}
                >
                  Скасувати
                </button>
              </div>
            </div>
          )}
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
