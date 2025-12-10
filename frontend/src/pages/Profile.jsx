import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { reviewsAPI } from '../api/client';

export default function Profile() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (user) {
      reviewsAPI
        .getForUser(user.id)
        .then((res) => setReviews(res.data))
        .catch(console.error);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="empty-state">
        <h3>Ви не авторизовані</h3>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">{user.username}</h1>
      <p className="page-subtitle">{user.email} · {user.role}</p>
      <h2 style={{ marginTop: 30, marginBottom: 16 }}>Мої рецензії ({reviews.length})</h2>
      {reviews.length === 0 ? (
        <p className="text-muted">Ви ще не написали жодної рецензії.</p>
      ) : (
        <div className="trending-list">
          {reviews.map((r) => (
            <div key={r.id} className="card" style={{ marginBottom: 8 }}>
              <strong>Трек #{r.track_id}</strong> — Оцінка: {r.rating}/10
              {r.text && <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>{r.text}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}