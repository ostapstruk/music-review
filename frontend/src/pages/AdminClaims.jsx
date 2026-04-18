import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiCheck, FiX, FiInbox, FiClock } from 'react-icons/fi';
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

export default function AdminClaims() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  usePageTitle('Заявки артистів');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      navigate('/');
    }
  }, [user]);

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
    if (!window.confirm(`Підтвердити заявку: ${claim.username} → "${claim.artist_name}"?`)) return;
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

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="page admin-claims-page">
      <h1 className="page-title">Заявки на володіння артистом</h1>

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
        <div className="empty-state card" style={{ padding: 40 }}>
          <FiInbox size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
          <h3>Заявок не знайдено</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {statusFilter === 'pending'
              ? 'Усі активні заявки оброблено.'
              : 'У цій категорії порожньо.'}
          </p>
        </div>
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
                {claim.message && (
                  <p className="claim-message">«{claim.message}»</p>
                )}
                <div className="claim-status-row">
                  <span className={`claim-status claim-status-${claim.status}`}>
                    {claim.status === 'pending' && <><FiClock size={12} /> На розгляді</>}
                    {claim.status === 'approved' && <><FiCheck size={12} /> Підтверджено</>}
                    {claim.status === 'rejected' && <><FiX size={12} /> Відхилено</>}
                  </span>
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
    </div>
  );
}
