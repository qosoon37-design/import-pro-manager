import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Package, FlaskConical } from 'lucide-react';
import { useAuthStore, DEMO_MODE } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();
  const { lang, setLang, theme, toggleTheme } = useUIStore();
  const navigate = useNavigate();

  const t = lang === 'ar'
    ? { title: 'تسجيل الدخول', email: 'البريد الإلكتروني', pass: 'كلمة المرور', submit: 'دخول', loading: 'جارٍ التحقق...', err: 'بيانات غير صحيحة' }
    : { title: 'Sign In', email: 'Email', pass: 'Password', submit: 'Sign In', loading: 'Signing in...', err: 'Invalid credentials' };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.err;
      toast.error(msg);
    }
  };

  const fillDemo = () => {
    setEmail('admin@erp.com');
    setPassword('admin123');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
        padding: '1rem',
      }}
    >
      {/* Top controls */}
      <div style={{ position: 'fixed', top: 16, insetInlineEnd: 16, display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          {lang === 'ar' ? 'EN' : 'AR'}
        </button>
        <button className="btn btn-secondary" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      <div
        className="card animate-scale-in"
        style={{ width: '100%', maxWidth: 420, padding: '2.5rem' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '1rem',
              background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <Package size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {lang === 'ar' ? 'نظام ERP للمخزون' : 'Inventory ERP'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {lang === 'ar' ? 'إدارة المخزون متعدد الفروع' : 'Multi-branch inventory management'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Email */}
          <div>
            <label
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}
            >
              {t.email}
            </label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@erp.com"
              style={{ width: '100%' }}
            />
          </div>

          {/* Password */}
          <div>
            <label
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}
            >
              {t.pass}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{ width: '100%', paddingInlineEnd: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute',
                  insetInlineEnd: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                  display: 'flex',
                }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                {t.loading}
              </>
            ) : (
              <>
                <LogIn size={18} />
                {t.submit}
              </>
            )}
          </button>
        </form>

        {/* Demo mode hint */}
        {DEMO_MODE && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)',
              border: '1px solid #c7d2fe',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <FlaskConical size={16} color="#4f46e5" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5' }}>
                {lang === 'ar' ? 'وضع العرض التجريبي' : 'Demo Mode'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#374151', lineHeight: 1.6 }}>
              <div><strong>Email:</strong> admin@erp.com</div>
              <div><strong>Password:</strong> admin123</div>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              style={{
                marginTop: 8,
                fontSize: '0.78rem',
                padding: '4px 12px',
                borderRadius: '0.5rem',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {lang === 'ar' ? 'تعبئة تلقائية' : 'Auto-fill'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
