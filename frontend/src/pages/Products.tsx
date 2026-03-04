import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Search, Plus, Loader } from 'lucide-react';
import api from '../utils/api';
import type { Product } from '../types';
import { useUIStore } from '../store/uiStore';

export default function ProductsPage() {
  const { lang } = useUIStore();
  const ar = lang === 'ar';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['products', q, page],
    queryFn: () => api.get<{ products: Product[]; total: number }>(`/products?q=${q}&page=${page}&limit=20`)
      .then(r => ({ data: r.data.products, total: r.data.total })),
    placeholderData: prev => prev,
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">{ar ? 'المنتجات' : 'Products'}</h1>
          <p className="page-subtitle">{ar ? 'إدارة قائمة المنتجات' : 'Manage product catalog'}</p>
        </div>
        <button className="btn btn-primary"><Plus size={16} />{ar ? 'منتج جديد' : 'New Product'}</button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingInlineStart: 36, width: '100%' }}
            placeholder={ar ? 'بحث عن منتج...' : 'Search products...'}
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        {isLoading ? (
          <div className="empty-state"><Loader size={32} className="animate-spin" /></div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="empty-state"><Package size={48} style={{ opacity: 0.3 }} /><span>{ar ? 'لا توجد منتجات' : 'No products found'}</span></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>{ar ? 'الاسم' : 'Name'}</th>
                    <th>{ar ? 'الفئة' : 'Category'}</th>
                    <th>{ar ? 'سعر الشراء' : 'Cost'}</th>
                    <th>{ar ? 'سعر البيع' : 'Sell'}</th>
                    <th>{ar ? 'الوحدة' : 'Unit'}</th>
                    <th>{ar ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.data.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku}</td>
                      <td style={{ fontWeight: 500 }}>{ar ? p.nameAr : p.name}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {p.category ? (ar ? p.category.nameAr : p.category.name) : '—'}
                      </td>
                      <td>${Number(p.costPrice).toFixed(2)}</td>
                      <td style={{ fontWeight: 600, color: '#22c55e' }}>${Number(p.sellPrice).toFixed(2)}</td>
                      <td style={{ fontSize: '0.85rem' }}>{ar ? p.unitAr : p.unit}</td>
                      <td>
                        <span className={`badge ${p.isActive ? 'badge-green' : 'badge-red'}`}>
                          {p.isActive ? (ar ? 'نشط' : 'Active') : (ar ? 'غير نشط' : 'Inactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span>{ar ? `${data!.total} منتج` : `${data!.total} products`}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ padding: '4px 12px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  {ar ? 'السابق' : 'Prev'}
                </button>
                <span style={{ padding: '4px 12px', display: 'flex', alignItems: 'center' }}>{page}</span>
                <button className="btn btn-secondary" style={{ padding: '4px 12px' }} disabled={(data?.data.length ?? 0) < 20} onClick={() => setPage(p => p + 1)}>
                  {ar ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
