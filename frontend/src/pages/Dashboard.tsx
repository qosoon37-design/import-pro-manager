import { useQuery } from '@tanstack/react-query';
import {
  Package, GitBranch, AlertTriangle, DollarSign,
  TrendingUp, TrendingDown, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import api from '../utils/api';
import type { InventorySummary, Transaction, Alert } from '../types';
import { useUIStore } from '../store/uiStore';
import { format } from 'date-fns';

const COLORS = {
  primary: '#2563eb',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#7c3aed',
};

function StatCard({
  label, value, icon: Icon, color, subtitle,
}: {
  label: string; value: string | number; icon: React.ElementType;
  color: string; subtitle?: string;
}) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="stat-icon" style={{ background: `${color}20` }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {subtitle && <div style={{ fontSize: '0.75rem', color: COLORS.success, marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
          <ArrowUpRight size={12} />{subtitle}
        </div>}
      </div>
    </div>
  );
}

function AlertBadge({ severity }: { severity: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    CRITICAL: { bg: '#fef2f2', color: '#ef4444' },
    WARNING: { bg: '#fffbeb', color: '#f59e0b' },
    INFO: { bg: '#eff6ff', color: '#3b82f6' },
  };
  const s = map[severity] ?? map.INFO;
  return (
    <span className="badge" style={{ background: s.bg, color: s.color, fontWeight: 700 }}>
      {severity}
    </span>
  );
}

function txTypeLabel(type: string, lang: 'ar' | 'en') {
  const labels: Record<string, [string, string]> = {
    PURCHASE: ['شراء', 'Purchase'],
    SALE: ['بيع', 'Sale'],
    TRANSFER_IN: ['تحويل وارد', 'Transfer In'],
    TRANSFER_OUT: ['تحويل صادر', 'Transfer Out'],
    DAMAGE: ['تالف', 'Damage'],
    ADJUSTMENT: ['تسوية', 'Adjustment'],
    INITIAL_LOAD: ['رصيد افتتاحي', 'Initial Load'],
  };
  return labels[type]?.[lang === 'ar' ? 0 : 1] ?? type;
}

function txTypeColor(type: string): string {
  const map: Record<string, string> = {
    PURCHASE: COLORS.success,
    SALE: COLORS.primary,
    TRANSFER_IN: COLORS.purple,
    TRANSFER_OUT: '#8b5cf6',
    DAMAGE: COLORS.danger,
    ADJUSTMENT: COLORS.warning,
    INITIAL_LOAD: '#64748b',
  };
  return map[type] ?? '#64748b';
}

export default function DashboardPage() {
  const { lang } = useUIStore();
  const ar = lang === 'ar';

  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: () => api.get<InventorySummary>('/inventory/summary/all').then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['alerts-recent'],
    queryFn: () => api.get<{ alerts: Alert[] }>('/alerts?limit=5').then(r => ({ data: r.data.alerts })),
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get<{ fastMoving: Array<{ nameAr: string; sku: string; totalSold: number }> }>('/reports/analytics').then(r => r.data),
  });

  // Build chart data from recent transactions grouped by day
  const recentTx: Transaction[] = summaryData?.recentTransactions ?? [];
  const chartData = buildChartData(recentTx);

  if (loadingSummary) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card" style={{ height: 100 }}>
            <div className="skeleton" style={{ height: '100%', borderRadius: '1rem' }} />
          </div>
        ))}
      </div>
    );
  }

  const summary = summaryData;

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">{ar ? 'لوحة التحكم' : 'Dashboard'}</h1>
        <p className="page-subtitle">
          {ar ? 'نظرة عامة على المخزون والعمليات' : 'Inventory and operations overview'}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard
          label={ar ? 'إجمالي المنتجات' : 'Total Products'}
          value={summary?.totalProducts ?? 0}
          icon={Package}
          color={COLORS.primary}
        />
        <StatCard
          label={ar ? 'الفروع النشطة' : 'Active Branches'}
          value={summary?.totalBranches ?? 0}
          icon={GitBranch}
          color={COLORS.purple}
        />
        <StatCard
          label={ar ? 'مخزون منخفض' : 'Low Stock Items'}
          value={summary?.lowStockItems ?? 0}
          icon={AlertTriangle}
          color={COLORS.warning}
        />
        <StatCard
          label={ar ? 'قيمة المخزون' : 'Inventory Value'}
          value={`$${((summary?.totalInventoryValue ?? 0) / 1000).toFixed(1)}k`}
          icon={DollarSign}
          color={COLORS.success}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Transactions chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1rem' }}>
            {ar ? 'المعاملات اليومية' : 'Daily Transactions'}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradSale" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPurchase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}
              />
              <Legend />
              <Area type="monotone" dataKey={ar ? 'مبيعات' : 'Sales'} stroke={COLORS.primary} fill="url(#gradSale)" strokeWidth={2} />
              <Area type="monotone" dataKey={ar ? 'مشتريات' : 'Purchases'} stroke={COLORS.success} fill="url(#gradPurchase)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Fast-moving items */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1rem' }}>
            {ar ? 'أكثر المنتجات مبيعاً' : 'Top Selling Products'}
          </h3>
          {analyticsData?.fastMoving && analyticsData.fastMoving.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analyticsData.fastMoving.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis
                  type="category"
                  dataKey="nameAr"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}
                />
                <Bar dataKey="totalSold" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <TrendingUp size={40} />
              <span>{ar ? 'لا توجد بيانات مبيعات' : 'No sales data yet'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Recent transactions + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem' }}>
        {/* Recent transactions */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1rem' }}>
            {ar ? 'آخر المعاملات' : 'Recent Transactions'}
          </h3>
          {recentTx.length === 0 ? (
            <div className="empty-state">
              <TrendingDown size={40} />
              <span>{ar ? 'لا توجد معاملات' : 'No transactions yet'}</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>{ar ? 'النوع' : 'Type'}</th>
                    <th>{ar ? 'الفرع' : 'Branch'}</th>
                    <th>{ar ? 'المبلغ' : 'Amount'}</th>
                    <th>{ar ? 'التاريخ' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx.slice(0, 8).map(tx => (
                    <tr key={tx.id}>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${txTypeColor(tx.type)}20`,
                            color: txTypeColor(tx.type),
                          }}
                        >
                          {txTypeLabel(tx.type, lang)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {tx.branch ? (ar ? tx.branch.nameAr : tx.branch.name) : '—'}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        ${Number(tx.totalAmount).toFixed(2)}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {format(new Date(tx.createdAt), 'MMM d, HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1rem' }}>
            {ar ? 'التنبيهات الأخيرة' : 'Recent Alerts'}
          </h3>
          {(alertsData?.data ?? []).length === 0 ? (
            <div className="empty-state">
              <AlertTriangle size={40} />
              <span>{ar ? 'لا توجد تنبيهات' : 'No alerts'}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(alertsData?.data ?? []).map(alert => (
                <div
                  key={alert.id}
                  className={`card alert-${alert.severity.toLowerCase()}`}
                  style={{ padding: '0.875rem', borderRadius: '0.75rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {alert.title}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {alert.message}
                      </div>
                    </div>
                    <AlertBadge severity={alert.severity} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chart data builder ───────────────────────────────────────────────────────
function buildChartData(transactions: Transaction[]) {
  const days: Record<string, { date: string; Sales: number; Purchases: number; مبيعات: number; مشتريات: number }> = {};

  transactions.forEach(tx => {
    const day = format(new Date(tx.createdAt), 'MM/dd');
    if (!days[day]) days[day] = { date: day, Sales: 0, Purchases: 0, مبيعات: 0, مشتريات: 0 };
    if (tx.type === 'SALE') {
      days[day].Sales += Number(tx.totalAmount);
      days[day]['مبيعات'] += Number(tx.totalAmount);
    }
    if (tx.type === 'PURCHASE') {
      days[day].Purchases += Number(tx.totalAmount);
      days[day]['مشتريات'] += Number(tx.totalAmount);
    }
  });

  return Object.values(days).slice(-7);
}
