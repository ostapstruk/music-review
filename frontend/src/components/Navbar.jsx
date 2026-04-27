import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMusic, FiLogIn, FiLogOut, FiUser, FiPlus, FiSun, FiMoon, FiEye, FiHeart, FiThumbsDown } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { statsAPI } from '../api/client';

const THEMES = [
  { id: 'dark', icon: FiMoon, label: 'Темна' },
  { id: 'light', icon: FiSun, label: 'Світла' },
  { id: 'contrast', icon: FiEye, label: 'Контраст' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'dark'
  );

  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);

  useEffect(() => {
    document.body.classList.remove('light-theme', 'high-contrast');
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else if (theme === 'contrast') {
      document.body.classList.add('high-contrast');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      statsAPI.getMyLikes()
        .then((res) => {
          setLikesCount(res.data.likes_received);
          setDislikesCount(res.data.dislikes_received);
        })
        .catch(() => {});
    }
  }, [user]);

  const cycleTheme = () => {
    const currentIndex = THEMES.findIndex(t => t.id === theme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setTheme(THEMES[nextIndex].id);
  };

  const CurrentIcon = THEMES.find(t => t.id === theme)?.icon || FiMoon;

  const handleLogout = () => {
    if (window.confirm('Ви впевнені, що хочете вийти?')) {
      logout();
      navigate('/');
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo">
          <FiMusic size={24} />
          <span>MusicReview</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link">Чарт</Link>
          <Link to="/tracks" className="nav-link">Треки</Link>
        </div>

        <div className="navbar-actions">
          <button
            className="theme-toggle"
            onClick={cycleTheme}
            title={THEMES.find(t => t.id === theme)?.label}
          >
            <CurrentIcon size={16} />
          </button>

          {user ? (
            <>
              <Link to="/tracks/new" className="btn btn-sm btn-primary">
                <FiPlus size={16} />
                Додати трек
              </Link>
              <Link to="/profile" className="nav-link nav-user">
                <FiUser size={16} />
                {user.username}
                {(likesCount > 0 || dislikesCount > 0) && (
                  <span className="likes-badge">
                    {likesCount > 0 && <><FiHeart size={10} /> {likesCount}</>}
                    {likesCount > 0 && dislikesCount > 0 && ' · '}
                    {dislikesCount > 0 && <><FiThumbsDown size={10} /> {dislikesCount}</>}
                  </span>
                )}
              </Link>
              <button onClick={handleLogout} className="btn btn-sm btn-secondary">
                <FiLogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-sm btn-primary">
              <FiLogIn size={16} />
              Увійти
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}