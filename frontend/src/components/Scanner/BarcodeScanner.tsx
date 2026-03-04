import { useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, ScanLine, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onResult: (code: string) => void;
}

export default function BarcodeScanner({ onResult }: Props) {
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const divId = 'qr-reader-container';

  const startScan = useCallback(async () => {
    setScanning(true);
    try {
      const scanner = new Html5Qrcode(divId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decoded) => {
          onResult(decoded);
          stopScan();
          toast.success(`Detected: ${decoded}`);
        },
        () => { /* quiet on frame error */ }
      );
    } catch (err) {
      setScanning(false);
      toast.error('Cannot access camera');
      console.error(err);
    }
  }, [onResult]);

  const stopScan = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } finally {
      scannerRef.current = null;
      setScanning(false);
    }
  }, []);

  return (
    <div>
      {scanning ? (
        <div style={{ position: 'relative' }}>
          <div
            id={divId}
            style={{ borderRadius: '1rem', overflow: 'hidden', minHeight: 200 }}
          />
          <div className="scanner-line" />
          <button
            className="btn btn-danger"
            onClick={stopScan}
            style={{ marginTop: 12 }}
          >
            <X size={16} />
            Stop
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={startScan}>
            <Camera size={16} />
            Scan Barcode
          </button>
        </div>
      )}
    </div>
  );
}

// ─── File-based barcode scan ──────────────────────────────────────────────────
export async function scanBarcodeFromFile(file: File): Promise<string | null> {
  const tmpId = 'qr-tmp-' + Date.now();
  const tmpDiv = document.createElement('div');
  tmpDiv.id = tmpId;
  tmpDiv.style.display = 'none';
  document.body.appendChild(tmpDiv);
  const scanner = new Html5Qrcode(tmpId);
  try {
    const result = await scanner.scanFileV2(file, false);
    return result.decodedText;
  } catch {
    return null;
  } finally {
    document.body.removeChild(tmpDiv);
  }
}
