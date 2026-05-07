import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authAPI } from '../api/client';

/**
 * /u/:username → редіректить на /users/:id.
 * Використовується для @-mention-ів: фронт рендерить
 * посилання на /u/нікнейм, а ми тут резолвимо у нумеричний id.
 */
export default function UserRedirect() {
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    authAPI
      .getByUsername(username)
      .then((res) => {
        if (cancelled) return;
        navigate(`/users/${res.data.id}`, { replace: true });
      })
      .catch(() => {
        if (cancelled) return;
        navigate('/', { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [username, navigate]);

  return (
    <div className="loading">
      <div className="spinner" />
    </div>
  );
}
