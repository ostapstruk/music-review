import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { statsAPI } from '../api/client';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import { useSpeech } from '../context/SpeechContext';
import { FiMusic, FiLogIn, FiLogOut, FiUser, FiPlus, FiSun, FiMoon, FiEye, FiHeart, FiThumbsDown, FiVolume2 } from 'react-icons/fi';
import Speakable from './Speakable';

const THEMES = [
  { id: 'dark', icon: FiMoon, label: 'Темна' },
  { id: 'light', icon: FiSun, label: 'Світла' },
  { id: 'contrast', icon: FiEye, label: 'Контраст' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { enabled: speechEnabled, toggle: toggleSpeech, speak } = useSpeech();
  const navigate = useNavigate();
  const location = useLocation();
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
          <Speakable text="Перейти до гарячого чарту">
            <Link to="/" className={"nav-link" + (location.pathname === "/" ? " nav-active" : "")}>
              Чарт
            </Link>
          </Speakable>
          <Speakable text="Переглянути усі треки">
            <Link to="/tracks" className={"nav-link" + (location.pathname.startsWith("/tracks") ? " nav-active" : "")}>
              Треки
            </Link>
          </Speakable>
        </div>

        <div className="navbar-actions">
          <button
            className="theme-toggle"
            onClick={cycleTheme}
            title={THEMES.find(t => t.id === theme)?.label}
            aria-label={"Змінити тему: " + (THEMES.find(t => t.id === theme)?.label || '')}
          >
            <CurrentIcon size={16} />
          </button>

          <button
            className={"theme-toggle" + (speechEnabled ? " speech-active" : "")}
            onClick={toggleSpeech}
            title={speechEnabled ? "Вимкнути озвучку" : "Увімкнути озвучку інтерфейсу"}
            aria-label={speechEnabled ? "Вимкнути озвучку інтерфейсу" : "Увімкнути озвучку інтерфейсу"}
          >
            <FiVolume2 size={16} />
          </button>

          {user ? (
            <>
              <Speakable text="Додати новий трек">
                <Link to="/tracks/new" className="btn btn-sm btn-primary">
                  <FiPlus size={16} />
                  Додати трек
                </Link>
              </Speakable>
              <Link to="/profile" className="nav-link nav-user">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <UserAvatar username={user.username} size={22} />
                )}
                {user.username}
                {(likesCount > 0 || dislikesCount > 0) && (
                  <span className="likes-badge">
                    {likesCount > 0 && <><FiHeart size={10} /> {likesCount}</>}
                    {likesCount > 0 && dislikesCount > 0 && ' · '}
                    {dislikesCount > 0 && <><FiThumbsDown size={10} /> {dislikesCount}</>}
                  </span>
                )}
              </Link>
              <button onClick={handleLogout} className="btn btn-sm btn-secondary" aria-label="Вийти з акаунту">
                <FiLogOut size={16} />
              </button>
            </>
          ) : (
            <Speakable text="Увійти в акаунт">
              <Link to="/login" className="btn btn-sm btn-primary">
                <FiLogIn size={16} />
                Увійти
              </Link>
            </Speakable>
          )}
        </div>
      </div>
    </nav>
  );
}