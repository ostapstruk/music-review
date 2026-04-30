import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

  return (
    <div className="activity-feed card">
      <h3 className="activity-title">
        <FiActivity size={18} />
        Остання активність
      </h3>
      <div className="activity-list">
        {events.map((event) => (
          <div key={event.id} className="activity-item">
            <Link to={"/users/" + event.user_id} className="activity-avatar-link">
              {event.avatar_url ? (
                <img
                  src={event.avatar_url}
                  alt=""
                  style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <UserAvatar username={event.username} size={24} />
              )}
            </Link>
            <span className="activity-text">{event.text}</span>
            <span className="activity-time">{timeAgo(event.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}