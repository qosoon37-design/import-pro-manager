import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { lang } = useUIStore();
  const ar = lang === 'ar';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-page)', gap: '1rem', padding: '2rem',
    }}>
      <div style={{ fontSize: '5rem', fontWeight: 900, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        404
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {ar ? 'الصفحة غير موجودة' : 'Page Not Found'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400 }}>
        {ar ? 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.' : 'The page you are looking for does not exist or has been moved.'}
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
        {ar ? 'العودة للرئيسية' : 'Back to Dashboard'}
      </button>
    </div>
  );
}
