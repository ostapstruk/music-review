import { useEffect, useState } from 'react';
import { FiCpu, FiRefreshCw } from 'react-icons/fi';
import { aiAPI } from '../api/client';

export default function AISummary({ trackId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSummary = () => {
    setLoading(true);
    setError(false);
    aiAPI
      .getSummary(trackId)
      .then((res) => setSummary(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, [trackId]);

  // Не показуємо блок, якщо замало рецензій
  if (error) return null;

  if (loading) {
    return (
      <div className="card ai-summary">
        <div className="ai-summary-header">
          <FiCpu size={18} />
          <span>ШІ аналізує рецензії...</span>
        </div>
        <div className="ai-summary-loading">
          <div className="spinner" style={{ width: 24, height: 24 }} />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="card ai-summary">
      <div className="ai-summary-header">
        <div className="ai-badge">
          <FiCpu size={16} />
          <span>ШІ-підсумок</span>
        </div>
        <button className="ai-refresh" onClick={fetchSummary} title="Оновити підсумок">
          <FiRefreshCw size={14} />
        </button>
      </div>
      <p className="ai-summary-text">{summary.summary}</p>
      <span className="ai-summary-meta">
        На основі {summary.reviews_count} рецензій
        {summary.is_cached && ' · з кешу'}
      </span>
    </div>
  );
}