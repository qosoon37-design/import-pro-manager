import { useQuery } from '@tanstack/react-query';
import { GitBranch, Loader, MapPin, Users, Warehouse } from 'lucide-react';
import api from '../utils/api';
import type { Branch } from '../types';
import { useUIStore } from '../store/uiStore';

export default function BranchesPage() {
  const { lang } = useUIStore();
  const ar = lang === 'ar';

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<{ branches: Branch[] }>('/branches').then(r => r.data.branches),
  });

  const branches = data ?? [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{ar ? 'الفروع' : 'Branches'}</h1>
        <p className="page-subtitle">{ar ? 'إدارة الفروع ومواقعها' : 'Manage branches and locations'}</p>
      </div>

      {isLoading ? (
        <div className="empty-state" style={{ minHeight: 200 }}>
          <Loader size={32} className="animate-spin" />
        </div>
      ) : branches.length === 0 ? (
        <div className="empty-state card" style={{ padding: '3rem' }}>
          <GitBranch size={48} style={{ opacity: 0.2 }} />
          <p>{ar ? 'لا توجد فروع' : 'No branches found'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '1rem' }}>
          {branches.map(branch => (
            <div key={branch.id} className="card" style={{ padding: '1.5rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '0.75rem',
                    background: branch.isMain ? 'rgba(124,58,237,0.12)' : 'rgba(37,99,235,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <GitBranch size={22} color={branch.isMain ? '#7c3aed' : '#2563eb'} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {ar ? branch.nameAr : branch.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {branch.code}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  {branch.isMain && (
                    <span className="badge" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed', fontSize: '0.72rem' }}>
                      {ar ? 'رئيسي' : 'Main'}
                    </span>
                  )}
                  <span className={`badge`} style={{
                    background: branch.isActive ? '#f0fdf4' : '#fef2f2',
                    color: branch.isActive ? '#22c55e' : '#ef4444',
                    fontSize: '0.72rem',
                  }}>
                    {branch.isActive ? (ar ? 'نشط' : 'Active') : (ar ? 'غير نشط' : 'Inactive')}
                  </span>
                </div>
              </div>

              {/* Address */}
              {branch.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '0.875rem' }}>
                  <MapPin size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{branch.address}</span>
                </div>
              )}

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <Users size={14} />
                  <span>
                    {branch._count?.users ?? 0} {ar ? 'مستخدم' : 'users'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <Warehouse size={14} />
                  <span>
                    {branch._count?.inventory ?? 0} {ar ? 'صنف' : 'items'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
