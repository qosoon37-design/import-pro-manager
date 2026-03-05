import { useRef, useState, useEffect, useCallback } from 'react'
import { useOCR } from '../hooks/useOCR'
import { useInventoryStore } from '../store/useInventoryStore'
import { useBranchStore } from '../store/useBranchStore'
import { useToastStore } from '../store/useToastStore'
import {
  validateImageFile,
  fileToDataUrl,
  lightEnhanceImage,
} from '../utils/imageUtils'
import { runDualPassOCR, runSinglePassOCR, type CartonData } from '../utils/ocrEngine'
import ImageCropper from './ImageCropper'

interface OCRImageEntry {
  id: string
  originalDataUrl: string
  dataUrl: string
  fileName: string
  cartons: CartonData[]
  rawText: string
  processed: boolean
  processing: boolean
  progress: number
  progressLabel: string
}

export default function OCRPanel() {
  const addItem = useInventoryStore((s) => s.addItem)
  const showToast = useToastStore((s) => s.showToast)
  const { branches, selectedBranch } = useBranchStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  const [images, setImages] = useState<OCRImageEntry[]>([])
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [manualFilter, setManualFilter] = useState('')
  const [targetBranch, setTargetBranch] = useState(selectedBranch)
  const [cropperImage, setCropperImage] = useState<{ id: string; dataUrl: string; fileName: string } | null>(null)

  const onError = useCallback(
    (msg: string) => showToast(msg, 'error'),
    [showToast]
  )

  const {
    isProcessing: cameraProcessing,
    progress: cameraProgress,
    capturedImage,
    captureAndRecognize,
    startCamera,
    stopCamera,
  } = useOCR(onError)

  const getBranchName = () => {
    const b = branches.find((br) => br.id === targetBranch)
    return b?.name || undefined
  }

  const lastProcessedCapture = useRef<string | null>(null)
  useEffect(() => {
    if (capturedImage && !cameraProcessing && capturedImage !== lastProcessedCapture.current) {
      lastProcessedCapture.current = capturedImage
      processImageFromCamera(capturedImage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage, cameraProcessing])

  const processImageFromCamera = async (dataUrl: string) => {
    const id = crypto.randomUUID()
    const lightImg = await lightEnhanceImage(dataUrl)
    setImages((prev) => [...prev, {
      id, originalDataUrl: dataUrl, dataUrl: lightImg, fileName: 'التقاط-كاميرا',
      cartons: [], rawText: '', processed: false, processing: true, progress: 0, progressLabel: '',
    }])
    try {
      const result = await runSinglePassOCR(dataUrl, (pct) => {
        setImages((prev) => prev.map((img) =>
          img.id === id ? { ...img, progress: pct } : img
        ))
      })
      setImages((prev) => prev.map((img) =>
        img.id === id ? { ...img, cartons: result.cartons, rawText: result.rawText, processed: true, processing: false, progress: 100 } : img
      ))
      if (result.cartons.length > 0) showToast(`تم اكتشاف ${result.cartons.length} كرتون`, 'success')
    } catch {
      setImages((prev) => prev.map((img) =>
        img.id === id ? { ...img, processed: true, processing: false } : img
      ))
    }
  }

  const processImageDataUrl = async (dataUrl: string, fileName: string) => {
    const id = crypto.randomUUID()
    const lightImg = await lightEnhanceImage(dataUrl)
    setImages((prev) => [...prev, {
      id, originalDataUrl: dataUrl, dataUrl: lightImg, fileName,
      cartons: [], rawText: '', processed: false, processing: true, progress: 0, progressLabel: '',
    }])
    try {
      const result = await runDualPassOCR(dataUrl, (pct, label) => {
        setImages((prev) => prev.map((img) =>
          img.id === id ? { ...img, progress: pct, progressLabel: label } : img
        ))
      })
      setImages((prev) => prev.map((img) =>
        img.id === id ? { ...img, cartons: result.cartons, rawText: result.rawText, processed: true, processing: false, progress: 100 } : img
      ))
      if (result.cartons.length > 0) showToast(`${fileName}: ${result.cartons.length} كرتون`, 'success')
      else showToast(`${fileName}: لم يتم العثور على بيانات`, 'warning')
    } catch {
      setImages((prev) => prev.map((img) =>
        img.id === id ? { ...img, processed: true, processing: false } : img
      ))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    for (const file of files) {
      const validation = validateImageFile(file)
      if (!validation.valid) { showToast(`${file.name}: ${validation.error!}`, 'error'); continue }
      const dataUrl = await fileToDataUrl(file)
      if (files.length === 1) {
        setCropperImage({ id: crypto.randomUUID(), dataUrl, fileName: file.name })
      } else {
        await processImageDataUrl(dataUrl, file.name)
      }
    }
  }

  const handleCropComplete = async (croppedDataUrl: string) => {
    if (!cropperImage) return
    const { fileName } = cropperImage
    setCropperImage(null)
    await processImageDataUrl(croppedDataUrl, fileName)
  }

  const handleRescan = (img: OCRImageEntry) => {
    setCropperImage({ id: img.id, dataUrl: img.originalDataUrl, fileName: img.fileName })
  }

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
    if (stream) { stopCamera(stream); setStream(null) }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
  }

  const handleCapture = () => {
    if (videoRef.current) captureAndRecognize(videoRef.current)
  }

  const updateCarton = (imageId: string, cartonIdx: number, field: 'itemNo' | 'qtyNum', value: string) => {
    setImages((prev) => prev.map((img) => {
      if (img.id !== imageId) return img
      const newCartons = [...img.cartons]
      const c = { ...newCartons[cartonIdx] }
      if (field === 'qtyNum') { c.qtyNum = parseInt(value, 10) || 0; c.qty = `${c.qtyNum} PCS` }
      else { c.itemNo = value }
      newCartons[cartonIdx] = c
      return { ...img, cartons: newCartons }
    }))
  }

  const addCartonToInventory = (carton: CartonData, imageDataUrl?: string) => {
    const code = carton.itemNo || carton.brand || carton.rawText.slice(0, 50)
    if (!code.trim()) return
    addItem(code.trim(), carton.qtyNum || 1, 'image-ocr', {
      imageDataUrl,
      branch: getBranchName(),
      cartons: 1,
      units: carton.qtyNum || 1,
    })
    showToast(`تمت إضافة: ${code} x ${carton.qtyNum || 1}`, 'success')
  }

  const duplicateCarton = (imageId: string, cartonIdx: number) => {
    setImages((prev) => prev.map((img) => {
      if (img.id !== imageId) return img
      const newCartons = [...img.cartons]
      newCartons.splice(cartonIdx + 1, 0, { ...newCartons[cartonIdx] })
      return { ...img, cartons: newCartons }
    }))
    showToast('تم تكرار العنصر', 'info')
  }

  const removeCarton = (imageId: string, cartonIdx: number) => {
    setImages((prev) => prev.map((img) => {
      if (img.id !== imageId) return img
      return { ...img, cartons: img.cartons.filter((_, i) => i !== cartonIdx) }
    }))
  }

  const removeImage = (id: string) => setImages((prev) => prev.filter((img) => img.id !== id))

  const addAllToInventory = () => {
    let count = 0
    const branchName = getBranchName()
    for (const img of images) {
      for (const c of img.cartons) {
        const code = c.itemNo || c.brand || c.rawText.slice(0, 50)
        if (code.trim()) {
          addItem(code.trim(), c.qtyNum || 1, 'image-ocr', { imageDataUrl: img.dataUrl, branch: branchName, cartons: 1, units: c.qtyNum || 1 })
          count++
        }
      }
    }
    if (count > 0) showToast(`تمت إضافة ${count} عنصر`, 'success')
  }

  const filterCartons = (cartons: CartonData[]): CartonData[] => {
    if (!manualFilter.trim()) return cartons
    const q = manualFilter.toLowerCase()
    return cartons.filter((c) =>
      c.itemNo.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q) ||
      c.qty.toLowerCase().includes(q) || c.rawText.toLowerCase().includes(q)
    )
  }

  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()) }
  }, [stream])

  const totalCartons = images.reduce((sum, img) => sum + img.cartons.length, 0)
  const anyProcessing = images.some((img) => img.processing) || cameraProcessing

  // Show cropper
  if (cropperImage) {
    return (
      <div className="space-y-3">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          تحديد منطقة المسح — {cropperImage.fileName}
        </h3>
        <ImageCropper
          imageUrl={cropperImage.dataUrl}
          onCrop={handleCropComplete}
          onCancel={() => setCropperImage(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-700 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-cyan-500" />
        التعرف على النص (OCR)
        {totalCartons > 0 && (
          <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">{totalCartons} عنصر</span>
        )}
      </h3>

      {/* Branch selector */}
      {branches.length > 0 && (
        <select value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)}
          className="w-full rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-700 outline-none focus:border-cyan-400">
          <option value="">الفرع المستهدف</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
        </select>
      )}

      {/* Camera view */}
      {cameraActive && (
        <div className="relative rounded-xl overflow-hidden bg-gray-900 min-h-[200px]">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          {cameraProcessing && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5">
              <div className="flex justify-between text-xs text-white mb-1">
                <span>جاري التحليل...</span><span>{cameraProgress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
                <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${cameraProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-3 gap-2">
        {!cameraActive ? (
          <>
            <button onClick={handleStartCamera} disabled={anyProcessing}
              className="rounded-xl bg-cyan-100 py-2.5 text-sm font-bold text-cyan-700 transition hover:bg-cyan-200 disabled:opacity-50 active:scale-[0.98] cursor-pointer">
              تشغيل الكاميرا
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={anyProcessing}
              className="rounded-xl bg-gradient-to-l from-purple-600 to-cyan-600 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 active:scale-[0.98] cursor-pointer">
              رفع صور
            </button>
            <button onClick={() => setImages([])} disabled={images.length === 0}
              className="rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-200 disabled:opacity-50 active:scale-[0.98] cursor-pointer">
              مسح الكل
            </button>
          </>
        ) : (
          <>
            <button onClick={handleCapture} disabled={cameraProcessing}
              className="col-span-2 rounded-xl bg-cyan-600 py-2.5 font-bold text-white transition hover:bg-cyan-700 disabled:opacity-50 active:scale-[0.98] cursor-pointer">
              {cameraProcessing ? 'جاري التحليل...' : 'التقاط وتحليل'}
            </button>
            <button onClick={handleStopCamera}
              className="rounded-xl bg-red-100 py-2.5 font-bold text-red-600 transition hover:bg-red-200 active:scale-[0.98] cursor-pointer">
              إيقاف
            </button>
          </>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" multiple className="hidden" onChange={handleFileUpload} />

      {/* Manual filter */}
      {images.length > 0 && (
        <div className="flex gap-2">
          <input type="text" value={manualFilter} onChange={(e) => setManualFilter(e.target.value)}
            placeholder="بحث / فلتر يدوي (مثال: A-10915)"
            className="flex-1 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-200"
            dir="auto" />
          {manualFilter && (
            <button onClick={() => setManualFilter('')}
              className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200 cursor-pointer">مسح</button>
          )}
        </div>
      )}

      {/* Results */}
      {images.length > 0 && (
        <div className="space-y-3">
          {images.map((img) => {
            const filteredCartons = filterCartons(img.cartons)
            return (
              <div key={img.id} className="rounded-xl border-2 border-cyan-200 bg-white overflow-hidden">
                <div className="relative cursor-pointer" onClick={() => setExpandedImage(expandedImage === img.id ? null : img.id)}>
                  <img src={img.dataUrl} alt={img.fileName}
                    className={`w-full object-contain bg-gray-50 transition-all ${expandedImage === img.id ? 'max-h-[600px]' : 'max-h-[120px] object-cover'}`} />
                  <button onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                    className="absolute top-1 left-1 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600 cursor-pointer">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleRescan(img) }} disabled={img.processing}
                    className="absolute top-1 right-1 rounded bg-sky-500/80 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-sky-600 cursor-pointer">
                    تحديد منطقة
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 flex justify-between items-end">
                    <span className="text-[10px] text-white truncate">{img.fileName}</span>
                    <span className="text-[10px] text-white/70">{expandedImage === img.id ? 'تصغير' : 'تكبير'}</span>
                  </div>
                </div>

                {img.processing && (
                  <div className="px-3 py-2 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{img.progressLabel || 'جاري التحليل...'}</span><span>{img.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${img.progress}%` }} />
                    </div>
                  </div>
                )}

                {img.processed && (
                  <div className="p-2 space-y-2">
                    {filteredCartons.length === 0 && img.cartons.length === 0 && (
                      <div className="text-center py-3">
                        <p className="text-xs text-gray-400 mb-2">لم يتم العثور على بيانات</p>
                        <button onClick={() => handleRescan(img)}
                          className="rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-200 cursor-pointer">
                          حدد منطقة المسح يدويا
                        </button>
                      </div>
                    )}

                    {filteredCartons.map((carton, cIdx) => {
                      const actualIdx = img.cartons.indexOf(carton)
                      return (
                        <div key={cIdx} className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 space-y-2">
                          {carton.brand && (
                            <span className="inline-block rounded bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-800">{carton.brand}</span>
                          )}
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500 w-14 flex-shrink-0">الكود:</label>
                            <input type="text" value={carton.itemNo}
                              onChange={(e) => updateCarton(img.id, actualIdx, 'itemNo', e.target.value)}
                              placeholder="ITEM NO"
                              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-mono font-bold outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-200"
                              dir="ltr" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500 w-14 flex-shrink-0">الكمية:</label>
                            <input type="number" value={carton.qtyNum || ''}
                              onChange={(e) => updateCarton(img.id, actualIdx, 'qtyNum', e.target.value)}
                              placeholder="0" min={0}
                              className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-mono font-bold outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-200"
                              dir="ltr" />
                            <span className="text-xs text-gray-400">{carton.qty}</span>
                          </div>
                          {carton.origin && <p className="text-[10px] text-gray-400">المنشأ: {carton.origin}</p>}
                          <div className="flex gap-1.5">
                            <button onClick={() => addCartonToInventory(carton, img.dataUrl)}
                              className="flex-1 rounded-lg bg-green-500 py-1.5 text-xs font-bold text-white hover:bg-green-600 active:scale-[0.98] cursor-pointer">
                              + اضافة للمخزون
                            </button>
                            <button onClick={() => duplicateCarton(img.id, actualIdx)}
                              className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-200 cursor-pointer">نسخ</button>
                            <button onClick={() => removeCarton(img.id, actualIdx)}
                              className="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-200 cursor-pointer">حذف</button>
                          </div>
                          <details>
                            <summary className="cursor-pointer text-[10px] text-gray-400 hover:text-gray-600">النص الخام</summary>
                            <pre dir="auto" className="mt-1 rounded bg-white p-1.5 text-[11px] text-gray-600 whitespace-pre-wrap border border-gray-200 max-h-[100px] overflow-y-auto">{carton.rawText}</pre>
                          </details>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {totalCartons > 0 && (
            <button onClick={addAllToInventory}
              className="w-full rounded-xl bg-green-500 py-2.5 font-bold text-white transition hover:bg-green-600 active:scale-[0.98] cursor-pointer">
              اضافة الكل ({totalCartons} عنصر)
            </button>
          )}
        </div>
      )}

      {images.length === 0 && !cameraActive && (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500 font-bold">التقط صور الكراتين أو ارفع صور</p>
          <p className="text-[10px] text-gray-400 mt-1">يتم استخراج ITEM NO و QTY تلقائيا + تحديد منطقة</p>
        </div>
      )}
    </div>
  )
}
