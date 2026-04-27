import { useEffect, useState } from 'react';
import { FiActivity } from 'react-icons/fi';
import { activityAPI } from '../api/client';
import UserAvatar from './UserAvatar';
import timeAgo from '../utils/timeAgo';

export default function ActivityFeed() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    activityAPI
      .getRecent(10)
      .then((res) => setEvents(res.data))
      .catch(console.error);
  }, []);

  if (events.length === 0) return null;

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'щойно';
    if (mins < 60) return `${mins} хв тому`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} год тому`;
    const days = Math.floor(hours / 24);
    return `${days} дн тому`;
  };

  return (
    <div className="activity-feed card">
      <h3 className="activity-title">
        <FiActivity size={18} />
        Остання активність
      </h3>
      <div className="activity-list">
        {events.map((event) => (
          <div key={event.id} className="activity-item">
            <UserAvatar username={event.username} size={24} />
            <span className="activity-text">{event.text}</span>
            <span className="activity-time">{timeAgo(event.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}