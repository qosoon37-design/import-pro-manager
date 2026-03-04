import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Loader, UserCheck, UserX } from 'lucide-react';
import api from '../utils/api';
import type { User } from '../types';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

const ROLE_LABELS: Record<string, [string, string]> = {
  GENERAL_MANAGER: ['مدير عام', 'General Manager'],
  DEPUTY_MANAGER: ['نائب مدير', 'Deputy Manager'],
  WAREHOUSE_MANAGER: ['مدير مخزن', 'Warehouse Manager'],
  BRANCH_USER: ['مستخدم فرع', 'Branch User'],
  AUDITOR: ['مدقق', 'Auditor'],
};

const ROLE_COLORS: Record<string, string> = {
  GENERAL_MANAGER: '#7c3aed',
  DEPUTY_MANAGER: '#2563eb',
  WAREHOUSE_MANAGER: '#0ea5e9',
  BRANCH_USER: '#22c55e',
  AUDITOR: '#f59e0b',
};

export default function UsersPage() {
  const { lang } = useUIStore();
  const { user: me } = useAuthStore();
  const ar = lang === 'ar';
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ users: User[] }>('/users').then(r => ({ data: r.data.users })),
  });

  const filtered = (data?.data ?? []).filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    u.email.toLowerCase().includes(q.toLowerCase())
  );

  const canManage = me?.role === 'GENERAL_MANAGER' || me?.role === 'DEPUTY_MANAGER';

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">{ar ? 'المستخدمون' : 'Users'}</h1>
          <p className="page-subtitle">{ar ? 'إدارة حسابات المستخدمين والصلاحيات' : 'Manage user accounts and permissions'}</p>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingInlineStart: 36, width: '100%' }}
            placeholder={ar ? 'بحث عن مستخدم...' : 'Search users...'}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        {isLoading ? (
          <div className="empty-state"><Loader size={32} className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><Users size={48} style={{ opacity: 0.3 }} /><span>{ar ? 'لا يوجد مستخدمون' : 'No users found'}</span></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? 'المستخدم' : 'User'}</th>
                  <th>{ar ? 'البريد الإلكتروني' : 'Email'}</th>
                  <th>{ar ? 'الدور' : 'Role'}</th>
                  <th>{ar ? 'الفرع' : 'Branch'}</th>
                  <th>{ar ? 'الحالة' : 'Status'}</th>
                  {canManage && <th>{ar ? 'إجراء' : 'Action'}</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const roleColor = ROLE_COLORS[u.role] ?? '#64748b';
                  const roleLabel = ROLE_LABELS[u.role];
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: `${roleColor}20`,
                            color: roleColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                          }}>
                            {(u.nameAr || u.name).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {ar ? (u.nameAr || u.name) : u.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{u.email}</td>
                      <td>
                        <span className="badge" style={{ background: `${roleColor}15`, color: roleColor }}>
                          {ar ? roleLabel?.[0] : roleLabel?.[1]}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {u.branch ? (ar ? u.branch.nameAr : u.branch.name) : '—'}
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {u.isActive
                            ? <><UserCheck size={14} color="#22c55e" /><span style={{ color: '#22c55e', fontSize: '0.8rem' }}>{ar ? 'نشط' : 'Active'}</span></>
                            : <><UserX size={14} color="#ef4444" /><span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{ar ? 'غير نشط' : 'Inactive'}</span></>
                          }
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          <button className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                            {ar ? 'تعديل' : 'Edit'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
