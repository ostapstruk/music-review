import { useEffect, useState } from 'react';
import { FiMusic, FiMessageSquare, FiUsers } from 'react-icons/fi';
import { statsAPI } from '../api/client';

export default function PlatformStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    statsAPI.get()
      .then((res) => setStats(res.data))
      .catch(console.error);
  }, []);

  if (!stats) return null;

  return (
    <div className="platform-stats">
      <div className="pstat">
        <FiMusic size={16} />
        <span><strong>{stats.tracks_count}</strong> треків</span>
      </div>
      <div className="pstat">
        <FiMessageSquare size={16} />
        <span><strong>{stats.reviews_count}</strong> рецензій</span>
      </div>
      <div className="pstat">
        <FiUsers size={16} />
        <span><strong>{stats.users_count}</strong> користувачів</span>
      </div>
    </div>
  );
}