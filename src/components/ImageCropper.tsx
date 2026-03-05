import { useRef, useState, useEffect, useCallback } from 'react'

interface ImageCropperProps {
  imageUrl: string
  onCrop: (croppedDataUrl: string) => void
  onCancel: () => void
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export default function ImageCropper({ imageUrl, onCrop, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [rect, setRect] = useState<Rect | null>(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [imgDims, setImgDims] = useState({ natW: 0, natH: 0, dispW: 0, dispH: 0, offX: 0, offY: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Load image and draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      fitCanvas(canvas, img)
    }
    img.src = imageUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl])

  const fitCanvas = (canvas: HTMLCanvasElement, img: HTMLImageElement) => {
    const container = containerRef.current
    if (!container) return
    const maxW = container.clientWidth
    const maxH = window.innerHeight * 0.6
    const scale = Math.min(maxW / img.width, maxH / img.height, 1)
    const dispW = Math.round(img.width * scale)
    const dispH = Math.round(img.height * scale)
    canvas.width = dispW
    canvas.height = dispH
    setImgDims({ natW: img.width, natH: img.height, dispW, dispH, offX: 0, offY: 0 })
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, dispW, dispH)
  }

  const drawOverlay = useCallback((r: Rect | null) => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    if (r && r.w > 5 && r.h > 5) {
      // Dim outside selection
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // Clear selection area
      ctx.clearRect(r.x, r.y, r.w, r.h)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, canvas.width, r.y) // top
      ctx.fillRect(0, r.y + r.h, canvas.width, canvas.height - r.y - r.h) // bottom
      ctx.fillRect(0, r.y, r.x, r.h) // left
      ctx.fillRect(r.x + r.w, r.y, canvas.width - r.x - r.w, r.h) // right

      // Border
      ctx.strokeStyle = '#0ea5e9'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.strokeRect(r.x, r.y, r.w, r.h)
      ctx.setLineDash([])

      // Corner handles
      const sz = 8
      ctx.fillStyle = '#0ea5e9'
      const corners = [
        [r.x, r.y], [r.x + r.w, r.y],
        [r.x, r.y + r.h], [r.x + r.w, r.y + r.h],
      ]
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx - sz / 2, cy - sz / 2, sz, sz)
      })
    }
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const br = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0]
      return { x: t.clientX - br.left, y: t.clientY - br.top }
    }
    return { x: e.clientX - br.left, y: e.clientY - br.top }
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    setStartPos(pos)
    setDrawing(true)
    setRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
  }

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return
    e.preventDefault()
    const pos = getPos(e)
    const newRect: Rect = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    }
    setRect(newRect)
    drawOverlay(newRect)
  }

  const handleEnd = () => {
    setDrawing(false)
  }

  const handleCrop = () => {
    if (!rect || rect.w < 10 || rect.h < 10) return
    const img = imgRef.current
    if (!img) return

    // Scale rect back to original image coordinates
    const scaleX = imgDims.natW / imgDims.dispW
    const scaleY = imgDims.natH / imgDims.dispH
    const cropX = Math.round(rect.x * scaleX)
    const cropY = Math.round(rect.y * scaleY)
    const cropW = Math.round(rect.w * scaleX)
    const cropH = Math.round(rect.h * scaleY)

    const cropCanvas = document.createElement('canvas')
    cropCanvas.width = cropW
    cropCanvas.height = cropH
    const ctx = cropCanvas.getContext('2d')!
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
    onCrop(cropCanvas.toDataURL('image/png'))
  }

  const handleScanAll = () => {
    onCrop(imageUrl)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-700">حدد منطقة النص بالسحب</p>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-red-500 cursor-pointer">الغاء</button>
      </div>

      <div ref={containerRef} className="relative rounded-xl overflow-hidden bg-gray-900 border-2 border-sky-300">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        {!rect && !drawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-lg bg-black/60 px-4 py-2 text-white text-sm text-center">
              <p className="font-bold">اسحب لتحديد منطقة النص</p>
              <p className="text-[10px] text-white/70">مثل Google Lens</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={handleScanAll}
          className="rounded-xl bg-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-300 active:scale-[0.98] cursor-pointer">
          مسح كامل الصورة
        </button>
        <button onClick={handleCrop} disabled={!rect || rect.w < 10 || rect.h < 10}
          className="col-span-2 rounded-xl bg-gradient-to-l from-sky-600 to-cyan-600 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 active:scale-[0.98] cursor-pointer">
          مسح المنطقة المحددة
        </button>
      </div>

      {rect && rect.w > 10 && (
        <p className="text-center text-[10px] text-gray-400">
          المنطقة: {Math.round(rect.w)}×{Math.round(rect.h)} بكسل
        </p>
      )}
    </div>
  )
}
