import { Link, useNavigate } from 'react-router-dom';
import { FiMusic, FiLogIn, FiLogOut, FiUser, FiPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
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
          {user ? (
            <>
              <Link to="/tracks/new" className="btn btn-sm btn-primary">
                <FiPlus size={16} />
                Додати трек
              </Link>
              <Link to="/profile" className="nav-link nav-user">
                <FiUser size={16} />
                {user.username}
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