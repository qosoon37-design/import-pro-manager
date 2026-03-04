import { Bell, Sun, Moon, Globe } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import type { Alert } from '../../types';

export default function Header() {
  const { theme, toggleTheme, lang, setLang } = useUIStore();
  const { user } = useAuthStore();

  const { data: alertsData } = useQuery({
    queryKey: ['alerts-unread'],
    queryFn: () => api.get<{ alerts: Alert[]; unreadCount: number }>('/alerts?unread=true').then(r => r.data),
    refetchInterval: 30_000,
  });

  const unreadCount = alertsData?.unreadCount ?? 0;

  return (
    <header className="app-header">
      <div className="header-title">
        {lang === 'ar' ? 'نظام إدارة المخزون متعدد الفروع' : 'Multi-Branch Inventory ERP'}
      </div>
      <div className="header-actions">
        {/* Language toggle */}
        <button
          className="btn ghost"
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          title="Toggle Language"
        >
          <Globe size={18} />
          <span style={{ fontSize: '0.8rem', marginInlineStart: 4 }}>
            {lang === 'ar' ? 'EN' : 'AR'}
          </span>
        </button>

        {/* Theme toggle */}
        <button className="btn ghost" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Alerts */}
        <div style={{ position: 'relative' }}>
          <button className="btn ghost" title="Alerts">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  insetInlineEnd: 4,
                  background: 'var(--danger)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 16,
                  height: 16,
                  fontSize: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User avatar */}
        {user && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'default',
              flexShrink: 0,
            }}
            title={user.name}
          >
            {(user.nameAr || user.name).charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
