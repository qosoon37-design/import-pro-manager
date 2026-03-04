import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Warehouse, Search, AlertTriangle, Loader } from 'lucide-react';
import api from '../utils/api';
import type { BranchInventory } from '../types';
import { useUIStore } from '../store/uiStore';

export default function InventoryPage() {
  const { lang } = useUIStore();
  const ar = lang === 'ar';
  const [lowOnly, setLowOnly] = useState(false);
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', lowOnly, q],
    queryFn: () =>
      api.get<{ inventory: BranchInventory[]; total: number }>(`/inventory?${lowOnly ? 'lowStock=true' : ''}&q=${q}`)
        .then(r => ({ data: r.data.inventory, total: r.data.total })),
    placeholderData: prev => prev,
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">{ar ? 'المخزون' : 'Inventory'}</h1>
          <p className="page-subtitle">{ar ? 'متابعة مستويات المخزون لكل فرع' : 'Track stock levels per branch'}</p>
        </div>
        <button
          className={`btn ${lowOnly ? 'btn-danger' : 'btn-secondary'}`}
          onClick={() => setLowOnly(v => !v)}
        >
          <AlertTriangle size={16} />
          {ar ? 'مخزون منخفض فقط' : 'Low Stock Only'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingInlineStart: 36, width: '100%' }}
            placeholder={ar ? 'بحث...' : 'Search...'}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        {isLoading ? (
          <div className="empty-state"><Loader size={32} className="animate-spin" /></div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="empty-state"><Warehouse size={48} style={{ opacity: 0.3 }} /><span>{ar ? 'لا توجد بيانات مخزون' : 'No inventory data'}</span></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? 'المنتج' : 'Product'}</th>
                  <th>SKU</th>
                  <th>{ar ? 'الفرع' : 'Branch'}</th>
                  <th>{ar ? 'الكمية' : 'Qty'}</th>
                  <th>{ar ? 'حد الطلب' : 'Reorder'}</th>
                  <th>{ar ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {data!.data.map(inv => {
                  const qty = inv.quantity;
                  const reorder = inv.product?.reorderLevel ?? 0;
                  const status = qty <= 0 ? 'out' : qty <= reorder ? 'low' : 'ok';
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 500 }}>{inv.product ? (ar ? inv.product.nameAr : inv.product.name) : '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.product?.sku}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{inv.branch ? (ar ? inv.branch.nameAr : inv.branch.name) : '—'}</td>
                      <td style={{ fontWeight: 700, color: status === 'out' ? '#ef4444' : status === 'low' ? '#f59e0b' : 'var(--text-primary)' }}>
                        {qty}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{reorder}</td>
                      <td>
                        <span className="badge" style={{
                          background: status === 'out' ? '#fef2f2' : status === 'low' ? '#fffbeb' : '#f0fdf4',
                          color: status === 'out' ? '#ef4444' : status === 'low' ? '#f59e0b' : '#22c55e',
                        }}>
                          {status === 'out' ? (ar ? 'نفد' : 'Out') : status === 'low' ? (ar ? 'منخفض' : 'Low') : (ar ? 'متاح' : 'OK')}
                        </span>
                      </td>
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
