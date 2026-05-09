import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiBell, FiAtSign, FiInbox } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../api/client';
import UserAvatar from '../components/UserAvatar';
import RoleBadge from '../components/RoleBadge';
import timeAgo from '../utils/timeAgo';
import usePageTitle from '../utils/usePageTitle';

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  usePageTitle('Повідомлення');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    notificationsAPI
      .list(100, 0)
      .then((res) => setItems(res.data))
      .catch(() => toast.error('Не вдалося завантажити сповіщення'))
      .finally(() => setLoading(false));

    // Тільки скидаємо бейдж на дзвонику. Виділення на самих айтемах
    // лишається — поки юзер не клацне по ним.
    notificationsAPI.markAllSeen().catch(() => {});
  }, [user]);

  const handleItemClick = (id) => {
    // Локально знімаємо виділення одразу (оптимістично) і шлемо запит.
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    notificationsAPI.markRead(id).catch(() => {});
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="loading"><div className="spinner" /></div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">
          <FiBell size={22} style={{ marginRight: 8, verticalAlign: -4 }} />
          Повідомлення
        </h1>
        <div className="empty-state card" style={{ padding: 40 }}>
          <FiInbox size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
          <h3>Поки що тиша</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Тут зʼявляться повідомлення, коли вас згадають через
            {' '}<code>@username</code>{' '}
            у рецензії або відповіді.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">
        <FiBell size={22} style={{ marginRight: 8, verticalAlign: -4 }} />
        Повідомлення
      </h1>

      <div className="notifications-list">
        {items.map((n) => (
          <NotificationItem key={n.id} n={n} onClick={() => handleItemClick(n.id)} />
        ))}
      </div>
    </div>
  );
}


function NotificationItem({ n, onClick }) {
  const sourceLabel = n.source_type === 'review' ? 'у рецензії' : 'у відповіді';

  return (
    <Link
      to={`/tracks/${n.track_id}`}
      onClick={onClick}
      className={`card notification-item${n.is_read ? '' : ' notification-unread'}`}
    >
      <div className="notification-avatar">
        {n.actor_avatar_url ? (
          <img
            src={n.actor_avatar_url}
            alt=""
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : n.actor_username ? (
          <UserAvatar username={n.actor_username} size={40} />
        ) : (
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-card-hover, rgba(255,255,255,0.05))',
              color: 'var(--text-muted)',
            }}
          >
            <FiAtSign size={20} />
          </div>
        )}
      </div>

      <div className="notification-body">
        <div className="notification-meta">
          <FiAtSign size={12} className="notification-icon" />
          <strong className="notification-actor">
            {n.actor_username || 'Видалений користувач'}
          </strong>
          {n.actor_role && n.actor_role !== 'listener' && (
            <RoleBadge role={n.actor_role} showLabel={false} />
          )}
          <span className="notification-text">
            {' '}згадав(ла) вас {sourceLabel} до{' '}
          </span>
          <span className="notification-track">«{n.track_title}»</span>
        </div>
        {n.text_snippet && (
          <p className="notification-snippet">{n.text_snippet}</p>
        )}
        <span
          className="notification-date"
          title={new Date(n.created_at).toLocaleString('uk-UA')}
        >
          {timeAgo(n.created_at)}
        </span>
      </div>

      {!n.is_read && <span className="notification-dot" aria-hidden="true" />}
    </Link>
  );
}
