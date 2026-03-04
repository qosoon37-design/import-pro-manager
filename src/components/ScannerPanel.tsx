import { useCallback, useEffect, useRef } from 'react'
import { useScanner } from '../hooks/useScanner'
import { useInventoryStore } from '../store/useInventoryStore'
import { useToastStore } from '../store/useToastStore'

export default function ScannerPanel() {
  const addItem = useInventoryStore((s) => s.addItem)
  const showToast = useToastStore((s) => s.showToast)
  const readerRef = useRef<HTMLDivElement>(null)

  const onScan = useCallback(
    (code: string) => {
      addItem(code, 1, 'scan')
      showToast(`تم مسح: ${code}`, 'success')
      if (navigator.vibrate) navigator.vibrate(200)
    },
    [addItem, showToast]
  )

  const onError = useCallback(
    (msg: string) => {
      showToast(`خطأ في الكاميرا: ${msg}`, 'error')
    },
    [showToast]
  )

  const { isScanning, start, stop } = useScanner({ onScan, onError })

  const handleToggle = () => {
    if (isScanning) {
      stop()
    } else {
      start('qr-reader')
    }
  }

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-700 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        ماسح الباركود / QR
      </h3>

      <div className="relative rounded-xl overflow-hidden bg-gray-900" ref={readerRef}>
        <div id="qr-reader" className="w-full min-h-[250px]" />
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="scanner-line" />
            <div className="absolute inset-4 rounded-lg border-2 border-blue-400/60" />
          </div>
        )}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="mx-auto mb-2 h-12 w-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <p className="text-sm">اضغط لبدء المسح</p>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleToggle}
        className={`w-full rounded-xl py-3 font-bold transition active:scale-[0.98] cursor-pointer ${
          isScanning
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
      >
        {isScanning ? 'إيقاف الكاميرا' : 'بدء مسح الباركود'}
      </button>
    </div>
  )
}
