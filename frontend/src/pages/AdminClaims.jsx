import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiCheck,
  FiX,
  FiInbox,
  FiClock,
  FiMusic,
  FiUserCheck,
  FiDisc,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../utils/usePageTitle';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'На розгляді' },
  { value: 'approved', label: 'Підтверджено' },
  { value: 'rejected', label: 'Відхилено' },
  { value: '', label: 'Усі' },
];

const TABS = [
  { id: 'claims', label: 'Заявки на володіння артистом', icon: FiUserCheck },
  { id: 'tracks', label: 'Заявки на додавання трека', icon: FiMusic },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('claims');

  usePageTitle('Адмін-панель');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      navigate('/');
    }
  }, [user]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="page admin-claims-page">
      <h1 className="page-title">Адмін-панель</h1>

      <div className="admin-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`admin-tab${activeTab === tab.id ? ' admin-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'claims' && <ArtistClaimsTab />}
      {activeTab === 'tracks' && <TrackSubmissionsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Artist claims
// ---------------------------------------------------------------------------

function ArtistClaimsTab() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const load = (status) =>
    adminAPI
      .listClaims(status || null)
      .then((res) => setClaims(res.data))
      .catch(() => toast.error('Не вдалося завантажити заявки'));

  useEffect(() => {
    setLoading(true);
    load(statusFilter).finally(() => setLoading(false));
  }, [statusFilter]);

  const handleApprove = async (claim) => {
    if (!window.confirm(`Підтвердити: ${claim.username} → "${claim.artist_name}"?`)) return;
    setActingId(claim.id);
    try {
      await adminAPI.approveClaim(claim.id);
      toast.success('Підтверджено');
      await load(statusFilter);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (claim) => {
    if (!window.confirm('Відхилити цю заявку?')) return;
    setActingId(claim.id);
    try {
      await adminAPI.rejectClaim(claim.id);
      toast.success('Відхилено');
      await load(statusFilter);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    } finally {
      setActingId(null);
    }
  };

  return (
    <>
      <div className="sort-buttons" style={{ marginBottom: 24 }}>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`btn btn-sm ${statusFilter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : claims.length === 0 ? (
        <EmptyState statusFilter={statusFilter} kind="claims" />
      ) : (
        <div className="reviews-list">
          {claims.map((claim) => (
            <div key={claim.id} className="card claim-item">
              <div className="claim-main">
                <div className="claim-meta">
                  <Link to={`/users/${claim.user_id}`} className="claim-user">
                    {claim.username}
                  </Link>
                  <span className="claim-arrow">→</span>
                  <Link to={`/artists/${claim.artist_id}`} className="claim-artist">
                    {claim.artist_name}
                    {claim.artist_spotify_id && (
                      <span className="text-muted" style={{ marginLeft: 6, fontSize: '0.75rem' }}>
                        ({claim.artist_spotify_id})
                      </span>
                    )}
                  </Link>
                </div>
                {claim.message && <p className="claim-message">«{claim.message}»</p>}
                <div className="claim-status-row">
                  <StatusPill status={claim.status} />
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {new Date(claim.created_at).toLocaleString('uk-UA')}
                  </span>
                </div>
              </div>
              {claim.status === 'pending' && (
                <div className="claim-actions">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleApprove(claim)}
                    disabled={actingId === claim.id}
                  >
                    <FiCheck size={14} /> Підтвердити
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleReject(claim)}
                    disabled={actingId === claim.id}
                  >
                    <FiX size={14} /> Відхилити
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Track submissions
// ---------------------------------------------------------------------------

function TrackSubmissionsTab() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const load = (status) =>
    adminAPI
      .listTrackSubmissions(status || null)
      .then((res) => setTracks(res.data))
      .catch(() => toast.error('Не вдалося завантажити заявки'));

  useEffect(() => {
    setLoading(true);
    load(statusFilter).finally(() => setLoading(false));
  }, [statusFilter]);

  const handleApprove = async (track) => {
    if (!window.confirm(`Підтвердити трек "${track.title}"?`)) return;
    setActingId(track.id);
    try {
      await adminAPI.approveTrack(track.id);
      toast.success('Трек опубліковано');
      await load(statusFilter);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (track) => {
    if (!window.confirm(`Відхилити трек "${track.title}"?`)) return;
    setActingId(track.id);
    try {
      await adminAPI.rejectTrack(track.id);
      toast.success('Заявку відхилено');
      await load(statusFilter);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Помилка');
    } finally {
      setActingId(null);
    }
  };

  return (
    <>
      <div className="sort-buttons" style={{ marginBottom: 24 }}>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`btn btn-sm ${statusFilter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : tracks.length === 0 ? (
        <EmptyState statusFilter={statusFilter} kind="tracks" />
      ) : (
        <div className="reviews-list">
          {tracks.map((track) => (
            <div key={track.id} className="card claim-item">
              <div className="claim-main" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {track.cover_url ? (
                  <img
                    src={track.cover_url}
                    alt={track.title}
                    style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--bg-card-hover, rgba(255,255,255,0.04))',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <FiDisc size={24} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="claim-meta">
                    <strong style={{ fontSize: '1rem' }}>{track.title}</strong>
                    <span className="claim-arrow">·</span>
                    <Link to={`/artists/${track.artist_id}`} className="claim-artist">
                      {track.artist_name}
                    </Link>
                  </div>
                  <div className="claim-status-row">
                    <StatusPill status={track.status} />
                    {track.submitter_username && (
                      <span style={{ fontSize: '0.8rem' }}>
                        додав:&nbsp;
                        <Link to={`/users/${track.submitted_by}`} className="claim-user">
                          @{track.submitter_username}
                        </Link>
                      </span>
                    )}
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {new Date(track.created_at).toLocaleString('uk-UA')}
                    </span>
                  </div>
                </div>
              </div>
              {track.status === 'pending' && (
                <div className="claim-actions">
                  <Link
                    to={`/tracks/${track.id}`}
                    className="btn btn-sm btn-secondary"
                    title="Відкрити сторінку треку для перегляду"
                  >
                    Глянути
                  </Link>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleApprove(track)}
                    disabled={actingId === track.id}
                  >
                    <FiCheck size={14} /> Підтвердити
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleReject(track)}
                    disabled={actingId === track.id}
                  >
                    <FiX size={14} /> Відхилити
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function StatusPill({ status }) {
  return (
    <span className={`claim-status claim-status-${status}`}>
      {status === 'pending' && <><FiClock size={12} /> На розгляді</>}
      {status === 'approved' && <><FiCheck size={12} /> Підтверджено</>}
      {status === 'rejected' && <><FiX size={12} /> Відхилено</>}
    </span>
  );
}

function EmptyState({ statusFilter, kind }) {
  return (
    <div className="empty-state card" style={{ padding: 40 }}>
      <FiInbox size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
      <h3>Заявок не знайдено</h3>
      <p style={{ color: 'var(--text-secondary)' }}>
        {statusFilter === 'pending'
          ? (kind === 'tracks'
            ? 'Усі активні заявки на треки оброблено.'
            : 'Усі активні заявки оброблено.')
          : 'У цій категорії порожньо.'}
      </p>
    </div>
  );
}
