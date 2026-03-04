import { useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import Tesseract from 'tesseract.js'
import { useInventoryStore } from '../store/useInventoryStore'
import { useToastStore } from '../store/useToastStore'
import {
  validateImageFile,
  fileToDataUrl,
  autoEnhanceImage,
} from '../utils/imageUtils'

type ProcessingMode = 'idle' | 'barcode' | 'ocr'

export default function ImageUploadPanel() {
  const addItem = useInventoryStore((s) => s.addItem)
  const logAudit = useInventoryStore((s) => s.logAudit)
  const showToast = useToastStore((s) => s.showToast)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState<ProcessingMode>('idle')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrResult, setOcrResult] = useState('')
  const [barcodeResult, setBarcodeResult] = useState('')

  const handleFile = useCallback(
    async (file: File) => {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        showToast(validation.error!, 'error')
        return
      }

      try {
        showToast('جاري معالجة الصورة...', 'info')
        const dataUrl = await fileToDataUrl(file)
        const enhanced = await autoEnhanceImage(dataUrl)
        setPreview(enhanced)
        setBarcodeResult('')
        setOcrResult('')
        logAudit('image-upload', file.name)

        // Try barcode detection first
        await detectBarcode(enhanced)
      } catch {
        showToast('خطأ في قراءة الملف', 'error')
      }
    },
    [showToast, logAudit]
  )

  const detectBarcode = async (dataUrl: string) => {
    setProcessing('barcode')
    try {
      const blob = dataUrlToBlob(dataUrl)
      const file = new File([blob], 'scan.jpg', { type: blob.type })
      const html5Qr = new Html5Qrcode('image-qr-temp')
      const result = await html5Qr.scanFileV2(file, false)
      html5Qr.clear()
      setBarcodeResult(result.decodedText)
      showToast(`تم اكتشاف باركود: ${result.decodedText}`, 'success')
    } catch {
      setBarcodeResult('')
      showToast('لم يتم العثور على باركود في الصورة', 'info')
    } finally {
      setProcessing('idle')
    }
  }

  const runOCR = async () => {
    if (!preview) return
    setProcessing('ocr')
    setOcrProgress(0)
    try {
      const result = await Tesseract.recognize(preview, 'ara+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round((m.progress ?? 0) * 100))
          }
        },
      })
      const text = result.data.text.trim()
      if (text) {
        setOcrResult(text)
        showToast('تم استخراج النص بنجاح', 'success')
      } else {
        showToast('لم يتم العثور على نص في الصورة', 'warning')
      }
    } catch {
      showToast('فشل في استخراج النص', 'error')
    } finally {
      setProcessing('idle')
      setOcrProgress(0)
    }
  }

  const addBarcodeToInventory = () => {
    if (!barcodeResult) return
    addItem(barcodeResult, 1, 'image-scan', { imageDataUrl: preview ?? undefined })
    showToast(`تمت إضافة: ${barcodeResult}`, 'success')
    setBarcodeResult('')
  }

  const addOcrToInventory = () => {
    const text = ocrResult.trim()
    if (!text) return
    addItem(text, 1, 'image-ocr', { imageDataUrl: preview ?? undefined })
    showToast('تمت إضافة النص المستخرج', 'success')
    setOcrResult('')
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const clearPreview = () => {
    setPreview(null)
    setBarcodeResult('')
    setOcrResult('')
    setProcessing('idle')
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-700 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-purple-500" />
        رفع صورة
      </h3>

      {/* Upload buttons */}
      {!preview && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-xl bg-purple-50 py-4 font-bold text-purple-700 transition hover:bg-purple-100 active:scale-[0.98] cursor-pointer"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-sm">تصوير مباشر</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-xl bg-purple-50 py-4 font-bold text-purple-700 transition hover:bg-purple-100 active:scale-[0.98] cursor-pointer"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-sm">رفع من الجهاز</span>
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Image preview */}
      {preview && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border-2 border-purple-200">
            <img src={preview} alt="preview" className="w-full max-h-[300px] object-contain bg-gray-50" />
            <button
              onClick={clearPreview}
              className="absolute top-2 left-2 rounded-full bg-red-500 p-1.5 text-white shadow hover:bg-red-600 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => detectBarcode(preview)}
              disabled={processing !== 'idle'}
              className="rounded-xl bg-blue-100 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-200 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              {processing === 'barcode' ? 'جاري الكشف...' : 'كشف باركود'}
            </button>
            <button
              onClick={runOCR}
              disabled={processing !== 'idle'}
              className="rounded-xl bg-cyan-100 py-2.5 text-sm font-bold text-cyan-700 transition hover:bg-cyan-200 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              {processing === 'ocr' ? 'جاري التحليل...' : 'استخراج نص (OCR)'}
            </button>
          </div>

          {/* OCR progress */}
          {processing === 'ocr' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>جاري التحليل...</span>
                <span>{ocrProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Barcode result */}
          {barcodeResult && (
            <div className="rounded-xl border-2 border-green-300 bg-green-50 p-3">
              <p className="mb-1 text-xs font-bold text-green-600">باركود مكتشف:</p>
              <p className="mb-2 font-mono text-lg font-bold text-green-800">{barcodeResult}</p>
              <button
                onClick={addBarcodeToInventory}
                className="w-full rounded-lg bg-green-500 py-2 text-sm font-bold text-white transition hover:bg-green-600 active:scale-[0.98] cursor-pointer"
              >
                إضافة إلى المخزون
              </button>
            </div>
          )}

          {/* OCR result */}
          {ocrResult && (
            <div className="space-y-2">
              <textarea
                value={ocrResult}
                onChange={(e) => setOcrResult(e.target.value)}
                className="w-full rounded-xl border border-cyan-300 bg-cyan-50 p-3 text-right outline-none focus:ring-2 focus:ring-cyan-200 transition"
                rows={3}
                dir="auto"
              />
              <button
                onClick={addOcrToInventory}
                className="w-full rounded-xl bg-green-500 py-2 font-bold text-white transition hover:bg-green-600 active:scale-[0.98] cursor-pointer"
              >
                إضافة النص إلى المخزون
              </button>
            </div>
          )}
        </div>
      )}

      {/* Supported formats info */}
      <p className="text-center text-xs text-gray-400">
        الصيغ المدعومة: JPG, PNG, PDF — الحد الأقصى: 10MB
      </p>

      {/* Hidden element for html5-qrcode file scanning */}
      <div id="image-qr-temp" className="hidden" />
    </div>
  )
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}
