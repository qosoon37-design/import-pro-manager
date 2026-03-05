import { useRef, useState, useCallback } from 'react'
import Tesseract from 'tesseract.js'

interface UseOCRResult {
  isProcessing: boolean
  progress: number
  recognizedText: string
  capturedImage: string | null
  setRecognizedText: (text: string) => void
  captureAndRecognize: (videoElement: HTMLVideoElement) => Promise<void>
  startCamera: () => Promise<MediaStream | null>
  stopCamera: (stream: MediaStream) => void
}

export function useOCR(onError?: (msg: string) => void): UseOCRResult {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [recognizedText, setRecognizedText] = useState('')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const startCamera = useCallback(async (): Promise<MediaStream | null> => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Camera error')
      return null
    }
  }, [onError])

  const stopCamera = useCallback((stream: MediaStream) => {
    stream.getTracks().forEach((track) => track.stop())
  }, [])

  const captureAndRecognize = useCallback(
    async (videoElement: HTMLVideoElement) => {
      if (isProcessing) return

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
      }
      const canvas = canvasRef.current
      canvas.width = videoElement.videoWidth || 640
      canvas.height = videoElement.videoHeight || 480
      canvas.getContext('2d')!.drawImage(videoElement, 0, 0)

      const frameDataUrl = canvas.toDataURL('image/jpeg', 0.85)
      setCapturedImage(frameDataUrl)

      setIsProcessing(true)
      setProgress(0)

      try {
        const result = await Tesseract.recognize(frameDataUrl, 'ara+eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round((m.progress ?? 0) * 100))
            }
          },
        })
        const text = result.data.text.trim()
        setRecognizedText(text || '')
        if (!text) {
          onError?.('No text detected')
        }
      } catch {
        onError?.('OCR recognition failed')
      } finally {
        setIsProcessing(false)
        setProgress(0)
      }
    },
    [isProcessing, onError]
  )

  return {
    isProcessing,
    progress,
    recognizedText,
    capturedImage,
    setRecognizedText,
    captureAndRecognize,
    startCamera,
    stopCamera,
  }
}
