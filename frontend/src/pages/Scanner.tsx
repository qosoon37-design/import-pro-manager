import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScanLine, Type, Image, Mic, Search, Package, AlertCircle } from 'lucide-react';
import BarcodeScanner from '../components/Scanner/BarcodeScanner';
import ImageUploadPanel from '../components/Scanner/ImageUploadPanel';
import VoiceInput from '../components/Scanner/VoiceInput';
import api from '../utils/api';
import type { Product } from '../types';
import { useUIStore } from '../store/uiStore';
import toast from 'react-hot-toast';

type ScanMode = 'camera' | 'image' | 'manual' | 'voice';

export default function ScannerPage() {
  const { lang } = useUIStore();
  const ar = lang === 'ar';
  const [mode, setMode] = useState<ScanMode>('camera');
  const [manualInput, setManualInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);

  const lookupProduct = async (barcode: string) => {
    setNotFound(false);
    try {
      const { data } = await api.get<{ product: Product }>(`/products/barcode/${barcode}`);
      setFoundProduct(data.product);
    } catch {
      setFoundProduct(null);
      setNotFound(true);
      toast.error(ar ? 'المنتج غير موجود' : 'Product not found');
    }
  };

  const handleBarcode = (code: string) => {
    setSearchQuery(code);
    lookupProduct(code);
  };

  const handleOcrText = (text: string) => {
    setSearchQuery(text.slice(0, 100));
    toast.success(ar ? `نص مستخرج: ${text.slice(0, 40)}...` : `OCR: ${text.slice(0, 40)}...`);
  };

  const handleVoice = (cmd: string, text: string) => {
    if (cmd === 'search') {
      const match = text.match(/(?:ابحث عن|search for|find)\s+(.+)/i);
      if (match) {
        setSearchQuery(match[1]);
        lookupProduct(match[1]);
      }
    }
  };

  const handleManualSearch = () => {
    if (manualInput.trim()) lookupProduct(manualInput.trim());
  };

  const modes: { key: ScanMode; label: string; labelAr: string; icon: React.ElementType }[] = [
    { key: 'camera', label: 'Camera Scan', labelAr: 'مسح بالكاميرا', icon: ScanLine },
    { key: 'image', label: 'Upload Image', labelAr: 'رفع صورة', icon: Image },
    { key: 'manual', label: 'Manual Entry', labelAr: 'إدخال يدوي', icon: Type },
    { key: 'voice', label: 'Voice Command', labelAr: 'أمر صوتي', icon: Mic },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{ar ? 'الماسح الضوئي' : 'Product Scanner'}</h1>
        <p className="page-subtitle">
          {ar ? 'مسح الباركود • استخراج النص • أوامر صوتية' : 'Barcode scan · OCR · Voice commands'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: scanner panel */}
        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {modes.map(({ key, label, labelAr, icon: Icon }) => (
              <button
                key={key}
                className={`btn ${mode === key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                onClick={() => setMode(key)}
              >
                <Icon size={15} />
                {ar ? labelAr : label}
              </button>
            ))}
          </div>

          {/* Mode content */}
          {mode === 'camera' && (
            <BarcodeScanner onResult={handleBarcode} />
          )}

          {mode === 'image' && (
            <ImageUploadPanel
              onBarcodeDetected={handleBarcode}
              onTextExtracted={handleOcrText}
              maxFiles={20}
            />
          )}

          {mode === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {ar ? 'أدخل الباركود أو اسم المنتج أو رقم SKU' : 'Enter barcode, product name, or SKU'}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  placeholder={ar ? 'باركود / SKU / اسم المنتج' : 'Barcode / SKU / Product name'}
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                  autoFocus
                />
                <button className="btn btn-primary" onClick={handleManualSearch}>
                  <Search size={16} />
                </button>
              </div>
            </div>
          )}

          {mode === 'voice' && (
            <VoiceInput onCommand={handleVoice} lang={lang} />
          )}

          {/* Query display */}
          {searchQuery && (
            <div style={{ marginTop: '1rem', padding: '10px 14px', background: 'var(--bg-page)', borderRadius: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <strong>{ar ? 'بحث: ' : 'Query: '}</strong>{searchQuery}
            </div>
          )}
        </div>

        {/* Right: result panel */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-primary)' }}>
            {ar ? 'نتيجة البحث' : 'Search Result'}
          </h3>

          {!foundProduct && !notFound && (
            <div className="empty-state">
              <ScanLine size={48} style={{ opacity: 0.3 }} />
              <p>{ar ? 'امسح منتجاً للبدء' : 'Scan a product to get started'}</p>
            </div>
          )}

          {notFound && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem', color: 'var(--text-muted)' }}>
              <AlertCircle size={48} color="#ef4444" />
              <p style={{ color: '#ef4444', fontWeight: 600 }}>
                {ar ? 'المنتج غير موجود' : 'Product not found'}
              </p>
              <p style={{ fontSize: '0.875rem' }}>
                {ar ? 'تحقق من الباركود أو أضف المنتج يدوياً' : 'Check the barcode or add the product manually'}
              </p>
            </div>
          )}

          {foundProduct && <ProductResultCard product={foundProduct} lang={lang} />}
        </div>
      </div>
    </div>
  );
}

// ─── Product result card ──────────────────────────────────────────────────────
function ProductResultCard({ product, lang }: { product: Product; lang: 'ar' | 'en' }) {
  const ar = lang === 'ar';
  const totalQty = (product.inventory ?? []).reduce((s, i) => s + i.quantity, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '0.75rem', border: '1px solid var(--border)' }}
          />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: '0.75rem', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={30} style={{ opacity: 0.3 }} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h4 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            {ar ? product.nameAr : product.name}
          </h4>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>SKU: {product.sku}</div>
          {product.barcode && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Barcode: {product.barcode}</div>}
        </div>
      </div>

      {/* Prices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {[
          { label: ar ? 'سعر الشراء' : 'Cost Price', value: `$${Number(product.costPrice).toFixed(2)}`, color: '#f59e0b' },
          { label: ar ? 'سعر البيع' : 'Sell Price', value: `$${Number(product.sellPrice).toFixed(2)}`, color: '#22c55e' },
          { label: ar ? 'الكمية الإجمالية' : 'Total Qty', value: `${totalQty} ${ar ? product.unitAr : product.unit}`, color: '#3b82f6' },
          { label: ar ? 'حد إعادة الطلب' : 'Reorder Level', value: product.reorderLevel, color: totalQty <= product.reorderLevel ? '#ef4444' : '#94a3b8' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-page)', borderRadius: '0.75rem', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Branch inventory */}
      {(product.inventory ?? []).length > 0 && (
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            {ar ? 'المخزون لكل فرع' : 'Stock by Branch'}
          </div>
          {product.inventory!.map(inv => (
            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {inv.branch ? (ar ? inv.branch.nameAr : inv.branch.name) : inv.branchId}
              </span>
              <span style={{ fontWeight: 600, color: inv.quantity <= product.reorderLevel ? '#ef4444' : 'var(--text-primary)' }}>
                {inv.quantity} {ar ? product.unitAr : product.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
