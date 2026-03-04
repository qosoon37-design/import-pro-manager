import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Loader, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import type { Alert } from '../types';
import { useUIStore } from '../store/uiStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AlertsPage() {
  const { lang } = useUIStore();
  const ar = lang === 'ar';
  const [unreadOnly, setUnreadOnly] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', unreadOnly],
    queryFn: () =>
      api.get<{ alerts: Alert[]; unreadCount: number }>(`/alerts${unreadOnly ? '?unread=true' : ''}`)
        .then(r => ({ data: r.data.alerts })),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.put('/alerts/read-all'),
    onSuccess: () => {
      toast.success(ar ? 'تم تعيين الكل كمقروء' : 'All marked as read');
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts-unread'] });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/alerts/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const alerts = data?.data ?? [];

  const severityStyle: Record<string, { bg: string; color: string; borderColor: string }> = {
    CRITICAL: { bg: '#fef2f2', color: '#ef4444', borderColor: '#ef4444' },
    WARNING: { bg: '#fffbeb', color: '#f59e0b', borderColor: '#f59e0b' },
    INFO: { bg: '#eff6ff', color: '#3b82f6', borderColor: '#3b82f6' },
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">{ar ? 'التنبيهات' : 'Alerts'}</h1>
          <p className="page-subtitle">{ar ? 'إشعارات النظام والمخزون' : 'System and inventory notifications'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${unreadOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setUnreadOnly(v => !v)}
          >
            <Bell size={16} />
            {ar ? 'غير مقروء فقط' : 'Unread Only'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck size={16} />
            {ar ? 'تعيين الكل كمقروء' : 'Mark All Read'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state" style={{ minHeight: 200 }}>
          <Loader size={32} className="animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="empty-state card" style={{ padding: '3rem' }}>
          <Bell size={48} style={{ opacity: 0.2 }} />
          <p>{ar ? 'لا توجد تنبيهات' : 'No alerts'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.map(alert => {
            const s = severityStyle[alert.severity] ?? severityStyle.INFO;
            return (
              <div
                key={alert.id}
                className="card"
                style={{
                  padding: '1rem 1.25rem',
                  borderInlineStart: `4px solid ${s.borderColor}`,
                  opacity: alert.isRead ? 0.65 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <AlertTriangle size={16} color={s.color} />
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {alert.title}
                      </span>
                      <span
                        className="badge"
                        style={{ background: s.bg, color: s.color, fontSize: '0.72rem' }}
                      >
                        {alert.severity}
                      </span>
                      {!alert.isRead && (
                        <span
                          style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: s.color, flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                      {alert.message}
                    </p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {alert.branch && (
                        <span>{ar ? alert.branch.nameAr : alert.branch.name}</span>
                      )}
                      {alert.product && (
                        <span>{ar ? alert.product.nameAr : alert.product.name}</span>
                      )}
                      <span>{format(new Date(alert.createdAt), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  </div>
                  {!alert.isRead && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '4px 10px', flexShrink: 0 }}
                      onClick={() => markRead.mutate(alert.id)}
                    >
                      <CheckCheck size={13} />
                      {ar ? 'تعيين كمقروء' : 'Mark Read'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
