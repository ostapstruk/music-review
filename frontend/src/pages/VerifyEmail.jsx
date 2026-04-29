import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiMail, FiRotateCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';
import usePageTitle from '../utils/usePageTitle';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60; // секунд

export default function VerifyEmail() {
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialEmail = params.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef([]);

  usePageTitle('Підтвердження email');

  useEffect(() => {
    // Якщо email прийшов через query — фокус одразу на код.
    if (initialEmail && inputs.current[0]) {
      inputs.current[0].focus();
    }
  }, [initialEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleDigitChange = (idx, value) => {
    const v = value.replace(/[^0-9]/g, '').slice(-1); // тільки одна цифра
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    if (v && idx < CODE_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData?.getData('text') || '').replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputs.current[Math.min(text.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== CODE_LENGTH) {
      toast.error(`Введіть ${CODE_LENGTH}-значний код`);
      return;
    }
    if (!email) {
      toast.error('Вкажіть email');
      return;
    }

    setSubmitting(true);
    try {
      await verifyEmail(email, code);
      toast.success('Email підтверджено!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Не вдалося підтвердити');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Вкажіть email перед повторним надсиланням');
      return;
    }
    setResending(true);
    try {
      await authAPI.resendCode(email);
      toast.success('Новий код надіслано');
      setCooldown(RESEND_COOLDOWN);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        const retryAfter = parseInt(err.response.headers['retry-after'] || '60', 10);
        setCooldown(retryAfter);
        toast.error(`Зачекайте ${retryAfter} с до наступного запиту`);
      } else {
        toast.error(err.response?.data?.detail || 'Помилка');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-card card">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <FiMail size={36} style={{ color: 'var(--accent)' }} />
        </div>
        <h1 className="auth-title">Підтвердження email</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Ми надіслали 6-значний код на <strong>{email || 'твій email'}</strong>.
          Введи його нижче, щоб активувати акаунт.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {!initialEmail && (
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}

          <div className="verify-code-row" onPaste={handlePaste}>
            {digits.map((d, idx) => (
              <input
                key={idx}
                ref={(el) => (inputs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className="verify-code-input"
                value={d}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                aria-label={`Цифра ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {submitting ? 'Перевіряємо…' : 'Підтвердити'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            style={{ marginRight: 8 }}
          >
            <FiRotateCw size={14} />
            {cooldown > 0 ? `Повторно за ${cooldown} с` : (resending ? 'Надсилаю…' : 'Надіслати ще раз')}
          </button>
        </div>

        <p className="auth-footer" style={{ marginTop: 12 }}>
          Не отримав код? Перевір спам або <Link to="/register">зареєструйся ще раз</Link>.
        </p>
      </div>
    </div>
  );
}
