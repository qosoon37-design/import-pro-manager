import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, Download, RotateCcw, Eye, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';
import api from '../utils/api';
import type { ExcelImport } from '../types';
import { useUIStore } from '../store/uiStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type ImportMode = 'replace' | 'update' | 'add' | 'merge';
type ImportType = 'products' | 'prices' | 'inventory' | 'initial_load';

interface PreviewData {
  sheets: Record<string, { headers: string[]; rows: unknown[][]; total: number }>;
  sheetNames: string[];
  filename: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  PENDING: <Clock size={16} color="#94a3b8" />,
  PROCESSING: <Loader size={16} color="#3b82f6" className="animate-spin" />,
  COMPLETED: <CheckCircle size={16} color="#22c55e" />,
  FAILED: <XCircle size={16} color="#ef4444" />,
  ROLLED_BACK: <RotateCcw size={16} color="#f59e0b" />,
};

export default function ExcelPage() {
  const { lang } = useUIStore();
  const ar = lang === 'ar';
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [importType, setImportType] = useState<ImportType>('products');
  const [importMode, setImportMode] = useState<ImportMode>('update');
  const [previewing, setPreviewing] = useState(false);

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['excel-imports'],
    queryFn: () => api.get<{ imports: ExcelImport[] }>('/excel/imports').then(r => ({ data: r.data.imports })),
  });

  const importMutation = useMutation({
    mutationFn: (form: FormData) => api.post('/excel/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: () => {
      toast.success(ar ? 'تم الاستيراد بنجاح' : 'Import successful');
      qc.invalidateQueries({ queryKey: ['excel-imports'] });
      setSelectedFile(null);
      setPreview(null);
    },
    onError: () => toast.error(ar ? 'فشل الاستيراد' : 'Import failed'),
  });

  const rollbackMutation = useMutation({
    mutationFn: (id: string) => api.post(`/excel/rollback/${id}`),
    onSuccess: () => {
      toast.success(ar ? 'تم التراجع بنجاح' : 'Rollback successful');
      qc.invalidateQueries({ queryKey: ['excel-imports'] });
    },
    onError: () => toast.error(ar ? 'فشل التراجع' : 'Rollback failed'),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(null);
    setPreviewing(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<PreviewData>('/excel/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
    } catch {
      toast.error(ar ? 'تعذر معاينة الملف' : 'Could not preview file');
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = () => {
    if (!selectedFile) return;
    const form = new FormData();
    form.append('file', selectedFile);
    form.append('type', importType);
    form.append('mode', importMode);
    importMutation.mutate(form);
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/excel/export/products', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(ar ? 'فشل التصدير' : 'Export failed');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{ar ? 'إدارة Excel' : 'Excel Management'}</h1>
        <p className="page-subtitle">
          {ar ? 'استيراد وتصدير البيانات مع دعم التراجع' : 'Import & export data with rollback support'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Import panel */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={18} />
            {ar ? 'استيراد Excel' : 'Import Excel'}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {ar ? 'نوع البيانات' : 'Data Type'}
              </label>
              <select className="input" value={importType} onChange={e => setImportType(e.target.value as ImportType)} style={{ width: '100%' }}>
                <option value="products">{ar ? 'منتجات' : 'Products'}</option>
                <option value="prices">{ar ? 'أسعار' : 'Prices'}</option>
                <option value="inventory">{ar ? 'مخزون' : 'Inventory'}</option>
                <option value="initial_load">{ar ? 'رصيد افتتاحي' : 'Initial Load'}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {ar ? 'وضع الاستيراد' : 'Import Mode'}
              </label>
              <select className="input" value={importMode} onChange={e => setImportMode(e.target.value as ImportMode)} style={{ width: '100%' }}>
                <option value="update">{ar ? 'تحديث الموجود' : 'Update Existing'}</option>
                <option value="add">{ar ? 'إضافة جديد فقط' : 'Add New Only'}</option>
                <option value="merge">{ar ? 'دمج' : 'Merge'}</option>
                <option value="replace">{ar ? 'استبدال الكل' : 'Replace All'}</option>
              </select>
            </div>
          </div>

          {/* File picker */}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div
            className={`dropzone${selectedFile ? ' active' : ''}`}
            onClick={() => fileRef.current?.click()}
            style={{ marginBottom: '1rem', textAlign: 'center', cursor: 'pointer' }}
          >
            <FileSpreadsheet size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            {selectedFile ? (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedFile.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {ar ? 'اضغط لاختيار ملف Excel أو CSV' : 'Click to select an Excel or CSV file'}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
            >
              {importMutation.isPending ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{ar ? 'جارٍ الاستيراد...' : 'Importing...'}</> : <><Upload size={16} />{ar ? 'استيراد' : 'Import'}</>}
            </button>
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={16} />
              {ar ? 'تصدير' : 'Export'}
            </button>
          </div>
        </div>

        {/* Preview panel */}
        <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={18} />
            {ar ? 'معاينة الملف' : 'File Preview'}
          </h3>
          {previewing && (
            <div className="empty-state">
              <Loader size={32} className="animate-spin" />
              <span>{ar ? 'جارٍ المعاينة...' : 'Loading preview...'}</span>
            </div>
          )}
          {!previewing && !preview && (
            <div className="empty-state">
              <FileSpreadsheet size={40} style={{ opacity: 0.3 }} />
              <span>{ar ? 'اختر ملفاً للمعاينة' : 'Select a file to preview'}</span>
            </div>
          )}
          {preview && (
            <div>
              <div style={{ marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {preview.sheetNames.map((s, i) => (
                  <span key={i} className="badge badge-blue" style={{ marginInlineEnd: 4 }}>{s}</span>
                ))}
              </div>
              {preview.sheetNames.map(sheetName => {
                const sheet = preview.sheets[sheetName];
                if (!sheet) return null;
                return (
                  <div key={sheetName} style={{ marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: 'var(--text-secondary)' }}>
                      {sheetName} — {ar ? `${sheet.total} صف` : `${sheet.total} rows`}
                    </div>
                    <div className="table-wrapper" style={{ maxHeight: 260, overflowY: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            {sheet.headers.map((h, i) => <th key={i}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {sheet.rows.map((row, ri) => (
                            <tr key={ri}>
                          {Object.values(row as unknown as Record<string, unknown>).map((cell, ci) => (
                                <td key={ci} style={{ fontSize: '0.8rem' }}>
                                  {String(cell ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Import history */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} />
          {ar ? 'سجل الاستيراد' : 'Import History'}
        </h3>

        {isLoading ? (
          <div className="empty-state"><Loader size={32} className="animate-spin" /></div>
        ) : (historyData?.data ?? []).length === 0 ? (
          <div className="empty-state">
            <FileSpreadsheet size={40} style={{ opacity: 0.3 }} />
            <span>{ar ? 'لا يوجد سجل استيراد' : 'No import history'}</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>{ar ? 'الملف' : 'File'}</th>
                  <th>{ar ? 'النوع' : 'Type'}</th>
                  <th>{ar ? 'الصفوف' : 'Rows'}</th>
                  <th>{ar ? 'الحالة' : 'Status'}</th>
                  <th>{ar ? 'التاريخ' : 'Date'}</th>
                  <th>{ar ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {(historyData?.data ?? []).map(imp => (
                  <tr key={imp.id}>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {imp.filename}
                    </td>
                    <td>
                      <span className="badge badge-blue">{imp.type}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {imp.importedRows}/{imp.totalRows}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {statusIcon[imp.status]}
                        <span style={{ fontSize: '0.8rem' }}>{imp.status}</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {format(new Date(imp.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td>
                      {imp.status === 'COMPLETED' && (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                          onClick={() => rollbackMutation.mutate(imp.id)}
                          disabled={rollbackMutation.isPending}
                        >
                          <RotateCcw size={13} />
                          {ar ? 'تراجع' : 'Rollback'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
