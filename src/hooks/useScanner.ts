import { useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface UseScannerOptions {
  onScan: (code: string) => void
  onError?: (error: string) => void
}

export function useScanner({ onScan, onError }: UseScannerOptions) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const start = useCallback(async (elementId: string) => {
    if (scannerRef.current) return

    try {
      const scanner = new Html5Qrcode(elementId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText)
          // Auto-stop after successful scan
          scanner.stop().then(() => {
            scanner.clear()
            scannerRef.current = null
            setIsScanning(false)
          }).catch(() => {
            scannerRef.current = null
            setIsScanning(false)
          })
        },
        () => {} // ignore scan failures
      )

      setIsScanning(true)
    } catch (err) {
      scannerRef.current = null
      setIsScanning(false)
      onError?.(err instanceof Error ? err.message : 'Camera error')
    }
  }, [onScan, onError])

  const stop = useCallback(async () => {
    if (!scannerRef.current) return
    try {
      await scannerRef.current.stop()
      scannerRef.current.clear()
    } catch {
      // ignore
    }
    scannerRef.current = null
    setIsScanning(false)
  }, [])

  return { isScanning, start, stop }
}
