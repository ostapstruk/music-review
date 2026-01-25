import { useEffect, useState } from 'react';
import { reviewsAPI } from '../api/client';

export default function RatingHistogram({ trackId }) {
  const [dist, setDist] = useState([]);

  useEffect(() => {
    reviewsAPI
      .getDistribution(trackId)
      .then((res) => setDist(res.data))
      .catch(console.error);
  }, [trackId]);

  if (dist.length === 0) return null;

  const maxCount = Math.max(...dist.map((d) => d.count), 1);
  const total = dist.reduce((sum, d) => sum + d.count, 0);
  
  if (total === 0) return null;

  return (
    <div className="card histogram">
      <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>Розподіл оцінок</h3>
      <div className="histogram-bars">
        {dist.map((d) => (
          <div key={d.rating} className="histogram-row">
            <span className="histogram-label">{d.rating}</span>
            <div className="histogram-track">
              <div
                className="histogram-fill"
                style={{ width: `${(d.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="histogram-count">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}