import { useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useInventoryStore } from '../store/useInventoryStore'
import { useBranchStore } from '../store/useBranchStore'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'
import {
  validateImageFile,
  fileToDataUrl,
  lightEnhanceImage,
} from '../utils/imageUtils'
import { runDualPassOCR, type CartonData } from '../utils/ocrEngine'
import ImageCropper from './ImageCropper'

interface ImageEntry {
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

export default function ImageUploadPanel() {
  const addItem = useInventoryStore((s) => s.addItem)
  const logAudit = useInventoryStore((s) => s.logAudit)
  const showToast = useToastStore((s) => s.showToast)
  const { branches, selectedBranch } = useBranchStore()
  const currentUser = useAuthStore((s) => s.currentUser)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [images, setImages] = useState<ImageEntry[]>([])
  const [barcodeResult, setBarcodeResult] = useState('')
  const [barcodeImageId, setBarcodeImageId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [scanningBarcode, setScanningBarcode] = useState(false)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [manualFilter, setManualFilter] = useState('')
  const [cropperImage, setCropperImage] = useState<{ id: string; dataUrl: string; fileName: string } | null>(null)
  const [targetBranch, setTargetBranch] = useState(selectedBranch)

  const getBranchName = () => {
    const b = branches.find((br) => br.id === targetBranch)
    return b?.name || currentUser?.defaultBranch || undefined
  }

  const processImageDataUrl = async (dataUrl: string, fileName: string, existingId?: string) => {
    const id = existingId || crypto.randomUUID()
    const lightImg = await lightEnhanceImage(dataUrl)

    if (!existingId) {
      setImages((prev) => [...prev, {
        id, originalDataUrl: dataUrl, dataUrl: lightImg, fileName,
        cartons: [], rawText: '', processed: false, processing: true, progress: 0, progressLabel: '',
      }])
    } else {
      setImages((prev) => prev.map((img) =>
        img.id === id ? { ...img, processing: true, processed: false, progress: 0, progressLabel: '', cartons: [], rawText: '' } : img
      ))
    }
    logAudit('image-upload', fileName)

    try {
      const result = await runDualPassOCR(dataUrl, (pct, label) => {
        setImages((prev) => prev.map((img) =>
          img.id === id ? { ...img, progress: pct, progressLabel: label } : img
        ))
      })
      setImages((prev) => prev.map((img) =>
        img.id === id ? { ...img, cartons: result.cartons, rawText: result.rawText, processed: true, processing: false, progress: 100 } : img
      ))
      if (result.cartons.length > 0) {
        showToast(`${fileName}: ${result.cartons.length} كرتون`, 'success')
      } else {
        showToast(`${fileName}: لم يتم العثور على بيانات`, 'warning')
      }
    } catch {
      setImages((prev) => prev.map((img) =>
        img.id === id ? { ...img, processed: true, processing: false } : img
      ))
      showToast(`${fileName}: فشل`, 'error')
    }
  }

  const handleFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const validation = validateImageFile(file)
        if (!validation.valid) { showToast(`${file.name}: ${validation.error!}`, 'error'); continue }
        const dataUrl = await fileToDataUrl(file)

        // Show cropper for each image
        setCropperImage({ id: crypto.randomUUID(), dataUrl, fileName: file.name })
        return // Process one at a time via cropper
      }
    },
    [showToast]
  )

  const handleCropComplete = async (croppedDataUrl: string) => {
    if (!cropperImage) return
    const { fileName } = cropperImage
    setCropperImage(null)
    await processImageDataUrl(croppedDataUrl, fileName)
  }

  const handleCropCancel = () => {
    setCropperImage(null)
  }

  // Quick upload without cropper (for multiple files)
  const handleQuickUpload = async (files: File[]) => {
    for (const file of files) {
      const validation = validateImageFile(file)
      if (!validation.valid) { showToast(`${file.name}: ${validation.error!}`, 'error'); continue }
      const dataUrl = await fileToDataUrl(file)
      await processImageDataUrl(dataUrl, file.name)
    }
  }

  const handleRescan = (img: ImageEntry) => {
    setCropperImage({ id: img.id, dataUrl: img.originalDataUrl, fileName: img.fileName })
  }

  const detectBarcode = async (imageId: string, dataUrl: string) => {
    setScanningBarcode(true); setBarcodeImageId(imageId)
    try {
      const blob = dataUrlToBlob(dataUrl)
      const file = new File([blob], 'scan.jpg', { type: blob.type })
      const html5Qr = new Html5Qrcode('image-qr-temp')
      const result = await html5Qr.scanFileV2(file, false)
      html5Qr.clear()
      setBarcodeResult(result.decodedText)
      showToast(`باركود: ${result.decodedText}`, 'success')
    } catch {
      setBarcodeResult(''); setBarcodeImageId(null)
      showToast('لم يتم العثور على باركود', 'info')
    } finally { setScanningBarcode(false) }
  }

  const addBarcodeToInventory = () => {
    if (!barcodeResult) return
    const img = images.find((i) => i.id === barcodeImageId)
    addItem(barcodeResult, 1, 'image-scan', { imageDataUrl: img?.dataUrl, branch: getBranchName() })
    showToast(`تمت إضافة: ${barcodeResult}`, 'success')
    setBarcodeResult(''); setBarcodeImageId(null)
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
          addItem(code.trim(), c.qtyNum || 1, 'image-ocr', {
            imageDataUrl: img.dataUrl,
            branch: branchName,
            cartons: 1,
            units: c.qtyNum || 1,
          })
          count++
        }
      }
    }
    if (count > 0) showToast(`تمت إضافة ${count} عنصر للمخزون`, 'success')
  }

  const filterCartons = (cartons: CartonData[]): CartonData[] => {
    if (!manualFilter.trim()) return cartons
    const q = manualFilter.toLowerCase()
    return cartons.filter((c) =>
      c.itemNo.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q) ||
      c.qty.toLowerCase().includes(q) || c.rawText.toLowerCase().includes(q)
    )
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 1) {
      handleFiles(files) // Single file -> cropper
    } else if (files.length > 1) {
      handleQuickUpload(files) // Multiple -> quick upload
    }
    e.target.value = ''
  }

  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) handleFiles(files)
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 1) handleFiles(files)
    else if (files.length > 1) handleQuickUpload(files)
  }

  const totalCartons = images.reduce((sum, img) => sum + img.cartons.length, 0)
  const anyProcessing = images.some((img) => img.processing)

  // Show cropper if active
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
          onCancel={handleCropCancel}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-700 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-purple-500" />
        استخراج البيانات من الصور
        {totalCartons > 0 && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-600">{totalCartons} عنصر</span>
        )}
      </h3>

      {/* Branch selector */}
      {branches.length > 0 && (
        <select value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)}
          className="w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700 outline-none focus:border-purple-400">
          <option value="">الفرع المستهدف</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
        </select>
      )}

      {/* Upload area */}
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50'}`}>
        {images.length === 0 && (
          <>
            <svg className="mx-auto mb-2 h-8 w-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="mb-1 text-sm font-bold text-gray-600">اسحب صور الكراتين هنا</p>
            <p className="mb-2 text-[10px] text-gray-400">صورة واحدة = تحديد منطقة المسح | عدة صور = مسح سريع</p>
          </>
        )}
        <div className={`grid ${images.length > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
          <button onClick={() => cameraInputRef.current?.click()} disabled={anyProcessing}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-50 py-3 font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 active:scale-[0.98] cursor-pointer">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-xs">تصوير</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={anyProcessing}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-50 py-3 font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 active:scale-[0.98] cursor-pointer">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-xs">رفع صور</span>
          </button>
          {images.length > 0 && (
            <button onClick={() => { setImages([]); setBarcodeResult(''); setBarcodeImageId(null) }}
              className="flex items-center justify-center rounded-xl bg-red-50 py-3 font-bold text-red-600 transition hover:bg-red-100 active:scale-[0.98] cursor-pointer">
              <span className="text-xs">مسح الكل</span>
            </button>
          )}
        </div>
      </div>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraInput} />
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" multiple className="hidden" onChange={handleFileInput} />

      {/* Manual filter */}
      {images.length > 0 && (
        <div className="flex gap-2">
          <input type="text" value={manualFilter} onChange={(e) => setManualFilter(e.target.value)}
            placeholder="بحث / فلتر يدوي (مثال: A-10915, RRR, 60 PCS)"
            className="flex-1 rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
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
              <div key={img.id} className="rounded-xl border-2 border-purple-200 bg-white overflow-hidden">
                {/* Image - clickable to expand */}
                <div className="relative cursor-pointer" onClick={() => setExpandedImage(expandedImage === img.id ? null : img.id)}>
                  <img src={img.dataUrl} alt={img.fileName}
                    className={`w-full object-contain bg-gray-50 transition-all ${expandedImage === img.id ? 'max-h-[600px]' : 'max-h-[120px] object-cover'}`} />
                  <button onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                    className="absolute top-1 left-1 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600 cursor-pointer">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute top-1 right-1 flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleRescan(img) }} disabled={img.processing}
                      className="rounded bg-sky-500/80 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-sky-600 cursor-pointer">
                      تحديد منطقة
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); detectBarcode(img.id, img.dataUrl) }} disabled={scanningBarcode}
                      className="rounded bg-blue-500/80 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-blue-600 cursor-pointer">
                      باركود
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 flex justify-between items-end">
                    <span className="text-[10px] text-white truncate">{img.fileName}</span>
                    <span className="text-[10px] text-white/70">{expandedImage === img.id ? 'تصغير' : 'تكبير'}</span>
                  </div>
                </div>

                {/* Progress */}
                {img.processing && (
                  <div className="px-3 py-2 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{img.progressLabel || 'جاري التحليل...'}</span>
                      <span>{img.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${img.progress}%` }} />
                    </div>
                  </div>
                )}

                {/* Barcode */}
                {barcodeImageId === img.id && barcodeResult && (
                  <div className="mx-2 mt-2 rounded-lg border border-green-300 bg-green-50 p-2 flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-green-800 flex-1">{barcodeResult}</span>
                    <button onClick={addBarcodeToInventory}
                      className="rounded bg-green-500 px-2 py-0.5 text-xs font-bold text-white hover:bg-green-600 cursor-pointer">+ اضافة</button>
                  </div>
                )}

                {/* Carton entries */}
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
                            <span className="inline-block rounded bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">{carton.brand}</span>
                          )}
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500 w-14 flex-shrink-0">الكود:</label>
                            <input type="text" value={carton.itemNo}
                              onChange={(e) => updateCarton(img.id, actualIdx, 'itemNo', e.target.value)}
                              placeholder="ITEM NO"
                              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-mono font-bold outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
                              dir="ltr" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500 w-14 flex-shrink-0">الكمية:</label>
                            <input type="number" value={carton.qtyNum || ''}
                              onChange={(e) => updateCarton(img.id, actualIdx, 'qtyNum', e.target.value)}
                              placeholder="0" min={0}
                              className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-mono font-bold outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
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
              اضافة الكل للمخزون ({totalCartons} عنصر)
            </button>
          )}
        </div>
      )}

      {images.length === 0 && (
        <p className="text-center text-xs text-gray-400">JPG, PNG — الحد الاقصى: 10MB — تحليل مزدوج + تحديد منطقة</p>
      )}
      <div id="image-qr-temp" className="hidden" />
    </div>
  )
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
