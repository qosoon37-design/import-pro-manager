import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Loader } from 'lucide-react';
import api from '../utils/api';
import type { Transaction } from '../types';
import { useUIStore } from '../store/uiStore';
import { format } from 'date-fns';

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  PURCHASE: { bg: '#f0fdf4', color: '#22c55e' },
  SALE: { bg: '#eff6ff', color: '#2563eb' },
  TRANSFER_IN: { bg: '#faf5ff', color: '#7c3aed' },
  TRANSFER_OUT: { bg: '#f5f3ff', color: '#8b5cf6' },
  DAMAGE: { bg: '#fef2f2', color: '#ef4444' },
  ADJUSTMENT: { bg: '#fffbeb', color: '#f59e0b' },
  INITIAL_LOAD: { bg: '#f8fafc', color: '#64748b' },
};

const TYPE_LABELS_AR: Record<string, string> = {
  PURCHASE: 'شراء', SALE: 'بيع', TRANSFER_IN: 'تحويل وارد',
  TRANSFER_OUT: 'تحويل صادر', DAMAGE: 'تالف', ADJUSTMENT: 'تسوية', INITIAL_LOAD: 'رصيد افتتاحي',
};

export default function TransactionsPage() {
  const { lang } = useUIStore();
  const ar = lang === 'ar';
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', typeFilter, page],
    queryFn: () =>
      api.get<{ transactions: Transaction[]; total: number }>(`/transactions?${typeFilter ? `type=${typeFilter}&` : ''}page=${page}&limit=20`)
        .then(r => ({ data: r.data.transactions, total: r.data.total })),
    placeholderData: prev => prev,
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{ar ? 'المعاملات' : 'Transactions'}</h1>
        <p className="page-subtitle">{ar ? 'سجل جميع العمليات على المخزون' : 'All inventory operations log'}</p>
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className={`btn ${typeFilter === '' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={() => { setTypeFilter(''); setPage(1); }}>
          {ar ? 'الكل' : 'All'}
        </button>
        {Object.entries(TYPE_LABELS_AR).map(([k, v]) => (
          <button key={k} className={`btn ${typeFilter === k ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={() => { setTypeFilter(k); setPage(1); }}>
            {ar ? v : k.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        {isLoading ? (
          <div className="empty-state"><Loader size={32} className="animate-spin" /></div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="empty-state"><ArrowLeftRight size={48} style={{ opacity: 0.3 }} /><span>{ar ? 'لا توجد معاملات' : 'No transactions'}</span></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>{ar ? 'النوع' : 'Type'}</th>
                    <th>{ar ? 'الفرع' : 'Branch'}</th>
                    <th>{ar ? 'المستخدم' : 'User'}</th>
                    <th>{ar ? 'المبلغ' : 'Amount'}</th>
                    <th>{ar ? 'العناصر' : 'Items'}</th>
                    <th>{ar ? 'التاريخ' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.data.map(tx => {
                    const tc = TYPE_COLORS[tx.type] ?? { bg: '#f8fafc', color: '#64748b' };
                    return (
                      <tr key={tx.id}>
                        <td>
                          <span className="badge" style={{ background: tc.bg, color: tc.color, fontWeight: 700 }}>
                            {ar ? TYPE_LABELS_AR[tx.type] : tx.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {tx.branch ? (ar ? tx.branch.nameAr : tx.branch.name) : '—'}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {tx.user?.nameAr || tx.user?.name || '—'}
                        </td>
                        <td style={{ fontWeight: 700 }}>${Number(tx.totalAmount).toFixed(2)}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{tx.items?.length ?? 0}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {format(new Date(tx.createdAt), 'MMM d, yyyy HH:mm')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span>{ar ? `${data!.total} معاملة` : `${data!.total} transactions`}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ padding: '4px 12px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>{ar ? 'السابق' : 'Prev'}</button>
                <span style={{ padding: '4px 12px', display: 'flex', alignItems: 'center' }}>{page}</span>
                <button className="btn btn-secondary" style={{ padding: '4px 12px' }} disabled={(data?.data.length ?? 0) < 20} onClick={() => setPage(p => p + 1)}>{ar ? 'التالي' : 'Next'}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
