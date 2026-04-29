import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../utils/usePageTitle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  usePageTitle('Вхід');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Ви увійшли!');
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      // Бек повертає {code: 'EMAIL_NOT_VERIFIED', email} у detail при 403.
      if (err.response?.status === 403 && detail?.code === 'EMAIL_NOT_VERIFIED') {
        toast('Email ще не підтверджено — введіть код', { icon: '✉️' });
        navigate(`/verify-email?email=${encodeURIComponent(detail.email || email)}`);
      } else {
        toast.error('Невірний email або пароль');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-card card">
        <h1 className="auth-title">Вхід</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Входимо...' : 'Увійти'}
          </button>
        </form>
        <p className="auth-footer">
          Немає акаунту? <Link to="/register">Зареєструватися</Link>
        </p>
      </div>
    </div>
  );
}