import { useRef, useState, useEffect, useCallback } from 'react'
import { useOCR } from '../hooks/useOCR'
import { useInventoryStore } from '../store/useInventoryStore'
import { useToastStore } from '../store/useToastStore'

export default function OCRPanel() {
  const addItem = useInventoryStore((s) => s.addItem)
  const showToast = useToastStore((s) => s.showToast)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  const onError = useCallback(
    (msg: string) => showToast(msg, 'error'),
    [showToast]
  )

  const {
    isProcessing,
    progress,
    recognizedText,
    setRecognizedText,
    captureAndRecognize,
    startCamera,
    stopCamera,
  } = useOCR(onError)

  const handleStartCamera = async () => {
    const mediaStream = await startCamera()
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream
      videoRef.current.play()
      setStream(mediaStream)
      setCameraActive(true)
    }
  }

  const handleStopCamera = () => {
    if (stream) {
      stopCamera(stream)
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const handleCapture = () => {
    if (videoRef.current) {
      captureAndRecognize(videoRef.current)
    }
  }

  const handleConfirm = () => {
    const text = recognizedText.trim()
    if (!text) {
      showToast('لا يوجد نص للإضافة', 'error')
      return
    }
    addItem(text, 1, 'ocr')
    showToast('تمت إضافة النص المقروء', 'success')
    setRecognizedText('')
    handleStopCamera()
  }

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [stream])

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-700 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-500" />
        التعرف على النص (OCR)
      </h3>

      <div className="relative rounded-xl overflow-hidden bg-gray-900 min-h-[250px]">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${cameraActive ? '' : 'hidden'}`}
          playsInline
          muted
        />
        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="mx-auto mb-2 h-12 w-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p className="text-sm">اضغط لبدء الكاميرا</p>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>جاري التحليل...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Camera controls */}
      <div className="grid grid-cols-2 gap-2">
        {!cameraActive ? (
          <button
            onClick={handleStartCamera}
            className="col-span-2 rounded-xl bg-cyan-100 py-3 font-bold text-cyan-700 transition hover:bg-cyan-200 active:scale-[0.98] cursor-pointer"
          >
            تشغيل الكاميرا
          </button>
        ) : (
          <>
            <button
              onClick={handleCapture}
              disabled={isProcessing}
              className="rounded-xl bg-cyan-600 py-3 font-bold text-white transition hover:bg-cyan-700 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              {isProcessing ? 'جاري التحليل...' : 'التقاط وتحليل'}
            </button>
            <button
              onClick={handleStopCamera}
              className="rounded-xl bg-red-100 py-3 font-bold text-red-600 transition hover:bg-red-200 active:scale-[0.98] cursor-pointer"
            >
              إيقاف الكاميرا
            </button>
          </>
        )}
      </div>

      {/* Recognized text */}
      {recognizedText && (
        <div className="space-y-2">
          <textarea
            value={recognizedText}
            onChange={(e) => setRecognizedText(e.target.value)}
            className="w-full rounded-xl border border-cyan-300 bg-cyan-50 p-3 text-right outline-none focus:ring-2 focus:ring-cyan-200 transition"
            rows={3}
            dir="auto"
          />
          <button
            onClick={handleConfirm}
            className="w-full rounded-xl bg-green-500 py-2 font-bold text-white transition hover:bg-green-600 active:scale-[0.98] cursor-pointer"
          >
            إضافة النص إلى المخزون
          </button>
        </div>
      )}
    </div>
  )
}
