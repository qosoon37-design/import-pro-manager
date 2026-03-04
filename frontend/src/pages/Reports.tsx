import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, TrendingUp, Package, DollarSign,
  Download, FileSpreadsheet, Loader, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import api from '../utils/api';
import type { AnalyticsData, ProfitReport } from '../types';
import { useUIStore } from '../store/uiStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type ReportTab = 'analytics' | 'inventory' | 'profit' | 'transactions';

const COLORS = ['#2563eb', '#7c3aed', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899'];

export default function ReportsPage() {
  const { lang } = useUIStore();
  const ar = lang === 'ar';
  const [tab, setTab] = useState<ReportTab>('analytics');
  const [dateFrom, setDateFrom] = useState(format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get<{ fastMoving: AnalyticsData['fastMoving']; stockOutWarnings: AnalyticsData['stockOutWarnings']; reorderSuggestions: AnalyticsData['reorderSuggestions'] }>('/reports/analytics').then(r => r.data),
    enabled: tab === 'analytics',
  });

  const { data: profit, isLoading: loadingProfit } = useQuery({
    queryKey: ['profit', dateFrom, dateTo],
    queryFn: () => api.get<ProfitReport>(`/reports/profits?from=${dateFrom}&to=${dateTo}`).then(r => r.data),
    enabled: tab === 'profit',
  });

  const exportReport = async (type: 'inventory' | 'transactions') => {
    try {
      const url = type === 'inventory'
        ? `/reports/inventory?export=excel`
        : `/reports/transactions?export=excel&from=${dateFrom}&to=${dateTo}`;
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(new Blob([res.data as BlobPart]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${type}-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error(ar ? 'فشل التصدير' : 'Export failed');
    }
  };

  const tabs: { key: ReportTab; label: string; labelAr: string; icon: React.ElementType }[] = [
    { key: 'analytics', label: 'Analytics', labelAr: 'التحليلات', icon: TrendingUp },
    { key: 'inventory', label: 'Inventory', labelAr: 'المخزون', icon: Package },
    { key: 'profit', label: 'Profit', labelAr: 'الأرباح', icon: DollarSign },
    { key: 'transactions', label: 'Transactions', labelAr: 'المعاملات', icon: BarChart3 },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{ar ? 'التقارير' : 'Reports'}</h1>
        <p className="page-subtitle">
          {ar ? 'تقارير شاملة مع تصدير PDF/Excel/CSV' : 'Comprehensive reports with PDF/Excel/CSV export'}
        </p>
      </div>

      {/* Date range + export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 'auto' }} />
        <span style={{ color: 'var(--text-muted)' }}>—</span>
        <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 'auto' }} />
        <button className="btn btn-secondary" onClick={() => exportReport('inventory')}>
          <FileSpreadsheet size={16} />
          {ar ? 'تصدير المخزون' : 'Export Inventory'}
        </button>
        <button className="btn btn-secondary" onClick={() => exportReport('transactions')}>
          <Download size={16} />
          {ar ? 'تصدير المعاملات' : 'Export Transactions'}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {tabs.map(({ key, label, labelAr, icon: Icon }) => (
          <button
            key={key}
            className={`btn ${tab === key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(key)}
          >
            <Icon size={16} />
            {ar ? labelAr : label}
          </button>
        ))}
      </div>

      {/* Analytics tab */}
      {tab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Fast-moving items */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>
              {ar ? 'أكثر المنتجات حركة (30 يوم)' : 'Fast-Moving Items (30 days)'}
            </h3>
            {loadingAnalytics ? (
              <div className="empty-state"><Loader size={32} className="animate-spin" /></div>
            ) : (analytics?.fastMoving ?? []).length === 0 ? (
              <div className="empty-state"><TrendingUp size={40} /><span>{ar ? 'لا بيانات' : 'No data'}</span></div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics!.fastMoving.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="nameAr" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }} />
                  <Bar dataKey="totalSold" radius={[4, 4, 0, 0]}>
                    {analytics!.fastMoving.slice(0, 8).map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Warnings */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>
              {ar ? 'تحذيرات المخزون' : 'Stock Warnings'}
            </h3>
            {loadingAnalytics ? (
              <div className="empty-state"><Loader size={32} className="animate-spin" /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 280, overflowY: 'auto' }}>
                {(analytics?.stockOutWarnings ?? []).length === 0 && (analytics?.reorderSuggestions ?? []).length === 0 ? (
                  <div className="empty-state"><AlertTriangle size={40} /><span>{ar ? 'لا تحذيرات' : 'No warnings'}</span></div>
                ) : (
                  <>
                    {(analytics?.stockOutWarnings ?? []).map(inv => (
                      <div key={inv.id} className="card alert-critical" style={{ padding: '0.75rem', borderRadius: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {ar ? inv.product?.nameAr : inv.product?.name}
                          </span>
                          <span className="badge" style={{ background: '#fef2f2', color: '#ef4444' }}>نفد</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {inv.branch ? (ar ? inv.branch.nameAr : inv.branch.name) : ''}
                        </div>
                      </div>
                    ))}
                    {(analytics?.reorderSuggestions ?? []).map(inv => (
                      <div key={inv.id} className="card alert-warning" style={{ padding: '0.75rem', borderRadius: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {ar ? inv.product?.nameAr : inv.product?.name}
                          </span>
                          <span className="badge" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                            {ar ? `${inv.quantity} وحدة` : `${inv.quantity} units`}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {inv.branch ? (ar ? inv.branch.nameAr : inv.branch.name) : ''}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profit tab */}
      {tab === 'profit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary cards */}
          {profit && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
              {[
                { label: ar ? 'الإيرادات' : 'Revenue', value: `$${profit.totalRevenue.toFixed(2)}`, color: '#22c55e' },
                { label: ar ? 'التكلفة' : 'Cost', value: `$${profit.totalCost.toFixed(2)}`, color: '#f59e0b' },
                { label: ar ? 'الربح' : 'Profit', value: `$${profit.totalProfit.toFixed(2)}`, color: '#2563eb' },
                { label: ar ? 'هامش الربح' : 'Margin', value: `${Number(profit.margin).toFixed(1)}%`, color: '#7c3aed' },
              ].map(({ label, value, color }) => (
                <div key={label} className="stat-card">
                  <div className="stat-icon" style={{ background: `${color}20` }}>
                    <DollarSign size={22} color={color} />
                  </div>
                  <div>
                    <div className="stat-value" style={{ color }}>{value}</div>
                    <div className="stat-label">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Profit chart */}
          <div className="card" style={{ padding: '1.5rem' }}>
            {loadingProfit ? (
              <div className="empty-state"><Loader size={32} className="animate-spin" /></div>
            ) : profit?.rows && profit.rows.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profit.rows.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="product" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }} />
                  <Bar dataKey="revenue" fill="#22c55e" name={ar ? 'إيرادات' : 'Revenue'} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#2563eb" name={ar ? 'ربح' : 'Profit'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><DollarSign size={40} /><span>{ar ? 'لا توجد بيانات' : 'No profit data'}</span></div>
            )}
          </div>
        </div>
      )}

      {/* Inventory + Transactions handled by export only (full list) */}
      {(tab === 'inventory' || tab === 'transactions') && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <FileSpreadsheet size={48} style={{ margin: '0 auto', opacity: 0.3, display: 'block' }} />
          <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>
            {ar
              ? 'اضغط على زر التصدير أعلاه لتحميل التقرير الكامل بصيغة Excel'
              : 'Click the export button above to download the full report as Excel'}
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => exportReport(tab as 'inventory' | 'transactions')}
          >
            <Download size={18} />
            {ar ? 'تحميل التقرير' : 'Download Report'}
          </button>
        </div>
      )}
    </div>
  );
}
