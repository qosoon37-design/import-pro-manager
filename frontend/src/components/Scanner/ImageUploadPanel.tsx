import { useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, FileImage, Loader, CheckCircle, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { scanBarcodeFromFile } from './BarcodeScanner';
import api from '../../utils/api';

interface OcrResult {
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  text?: string;
  barcode?: string;
  uploaded?: boolean;
}

interface Props {
  onTextExtracted?: (text: string, filename: string) => void;
  onBarcodeDetected?: (code: string) => void;
  maxFiles?: number;
}

export default function ImageUploadPanel({ onTextExtracted, onBarcodeDetected, maxFiles = 20 }: Props) {
  const [items, setItems] = useState<OcrResult[]>([]);

  const updateItem = (idx: number, patch: Partial<OcrResult>) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const processItem = async (item: OcrResult, idx: number) => {
    updateItem(idx, { status: 'processing' });
    try {
      // Try barcode first
      const barcode = await scanBarcodeFromFile(item.file);
      if (barcode) {
        updateItem(idx, { barcode, status: 'done' });
        onBarcodeDetected?.(barcode);
        return;
      }

      // OCR text extraction
      const { data } = await Tesseract.recognize(item.file, 'ara+eng', {
        logger: () => {},
      });
      const text = data.text.trim();
      updateItem(idx, { text, status: 'done' });
      if (text) onTextExtracted?.(text, item.file.name);

      // Upload to server
      const form = new FormData();
      form.append('images', item.file);
      await api.post('/uploads/images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateItem(idx, { uploaded: true });
    } catch (err) {
      updateItem(idx, { status: 'error' });
      console.error(err);
    }
  };

  const onDrop = (accepted: File[]) => {
    const remaining = maxFiles - items.length;
    const batch = accepted.slice(0, remaining);
    if (accepted.length > remaining) {
      toast.error(`Max ${maxFiles} images allowed`);
    }
    const newItems: OcrResult[] = batch.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      status: 'pending',
    }));
    setItems(prev => {
      const updated = [...prev, ...newItems];
      // Auto-process each new item
      newItems.forEach((_, relIdx) => {
        const absIdx = prev.length + relIdx;
        setTimeout(() => processItem(updated[absIdx], absIdx), 100 * relIdx);
      });
      return updated;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [] },
    maxFiles,
    disabled: items.length >= maxFiles,
  });

  const removeItem = (idx: number) => {
    URL.revokeObjectURL(items[idx].preview);
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const reprocess = (idx: number) => processItem(items[idx], idx);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`dropzone${isDragActive ? ' active' : ''}`}
        style={{ textAlign: 'center' }}
      >
        <input {...getInputProps()} />
        <Upload size={36} style={{ margin: '0 auto', opacity: 0.5 }} />
        <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {isDragActive ? 'Drop images here...' : `Drag & drop images or click to browse (max ${maxFiles})`}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
          JPEG, PNG, WebP, PDF supported
        </p>
      </div>

      {/* Preview grid */}
      {items.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))',
            gap: '0.75rem',
          }}
        >
          {items.map((item, idx) => (
            <div
              key={idx}
              className="card"
              style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              {/* Thumbnail */}
              <div style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', height: 100 }}>
                <img
                  src={item.preview}
                  alt={item.file.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Overlay status */}
                {item.status === 'processing' && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader size={24} color="white" className="animate-spin" />
                  </div>
                )}
                {item.status === 'done' && (
                  <div style={{ position: 'absolute', top: 4, insetInlineEnd: 4 }}>
                    <CheckCircle size={18} color="#22c55e" />
                  </div>
                )}
                {/* Remove */}
                <button
                  onClick={() => removeItem(idx)}
                  style={{ position: 'absolute', top: 4, insetInlineStart: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* File name */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.file.name}
              </div>

              {/* Barcode result */}
              {item.barcode && (
                <div style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: 6 }}>
                  📊 {item.barcode}
                </div>
              )}

              {/* OCR preview */}
              {item.text && !item.barcode && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', maxHeight: 40, overflow: 'hidden', lineHeight: 1.3 }}>
                  {item.text.slice(0, 80)}...
                </div>
              )}

              {/* Error */}
              {item.status === 'error' && (
                <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '3px 8px' }} onClick={() => reprocess(idx)}>
                  <FileImage size={12} /> Retry
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
