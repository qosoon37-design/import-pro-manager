import { SUPPORTED_IMAGE_FORMATS, MAX_FILE_SIZE } from '../types/inventory'

interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateImageFile(file: File): ValidationResult {
  if (!SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `نوع الملف غير مدعوم. الأنواع المدعومة: JPG, PNG, PDF`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `حجم الملف (${sizeMB}MB) يتجاوز الحد الأقصى (10MB)`,
    }
  }

  return { valid: true }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

// =====================================================================
//  CV2-equivalent image processing helpers (single-channel Uint8Array)
// =====================================================================

/** Convert RGBA imageData to single-channel grayscale array */
function toGrayscale(rgba: Uint8ClampedArray, pixelCount: number): Uint8Array {
  const gray = new Uint8Array(pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    const off = i * 4
    gray[i] = Math.round(0.299 * rgba[off] + 0.587 * rgba[off + 1] + 0.114 * rgba[off + 2])
  }
  return gray
}

/** Write single-channel grayscale back to RGBA imageData */
function grayToRGBA(gray: Uint8Array, rgba: Uint8ClampedArray): void {
  for (let i = 0; i < gray.length; i++) {
    const off = i * 4
    rgba[off] = gray[i]
    rgba[off + 1] = gray[i]
    rgba[off + 2] = gray[i]
  }
}

/**
 * Gaussian blur 3x3 — equivalent to cv2.GaussianBlur(img, (3,3), 0)
 * Kernel: [1,2,1; 2,4,2; 1,2,1] / 16
 */
function gaussianBlur3x3(gray: Uint8Array, w: number, h: number): void {
  const src = new Uint8Array(gray)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const val = (
        src[(y - 1) * w + (x - 1)] + src[(y - 1) * w + x] * 2 + src[(y - 1) * w + (x + 1)] +
        src[y * w + (x - 1)] * 2 + src[y * w + x] * 4 + src[y * w + (x + 1)] * 2 +
        src[(y + 1) * w + (x - 1)] + src[(y + 1) * w + x] * 2 + src[(y + 1) * w + (x + 1)]
      ) >> 4
      gray[y * w + x] = val
    }
  }
}

/**
 * Adaptive threshold using integral image (summed area table).
 * Equivalent to cv2.adaptiveThreshold(img, 255, ADAPTIVE_THRESH_MEAN_C, THRESH_BINARY, blockSize, C)
 */
function adaptiveThreshold(gray: Uint8Array, w: number, h: number, blockSize: number, C: number): void {
  const len = w * h

  // Build integral image (Float64 to avoid overflow on large images)
  const integral = new Float64Array(len)
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x]
      integral[y * w + x] = rowSum + (y > 0 ? integral[(y - 1) * w + x] : 0)
    }
  }

  const half = (blockSize - 1) >> 1

  // Keep original values for reading since we overwrite in-place
  const src = new Uint8Array(gray)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const y1 = Math.max(0, y - half)
      const y2 = Math.min(h - 1, y + half)
      const x1 = Math.max(0, x - half)
      const x2 = Math.min(w - 1, x + half)

      const count = (y2 - y1 + 1) * (x2 - x1 + 1)
      let sum = integral[y2 * w + x2]
      if (y1 > 0) sum -= integral[(y1 - 1) * w + x2]
      if (x1 > 0) sum -= integral[y2 * w + (x1 - 1)]
      if (y1 > 0 && x1 > 0) sum += integral[(y1 - 1) * w + (x1 - 1)]

      const mean = sum / count
      gray[y * w + x] = src[y * w + x] > mean - C ? 255 : 0
    }
  }
}

/**
 * Otsu's threshold — equivalent to cv2.threshold(img, 0, 255, THRESH_BINARY + THRESH_OTSU)
 */
function otsuBinarize(gray: Uint8Array): void {
  const histogram = new Uint32Array(256)
  for (let i = 0; i < gray.length; i++) histogram[gray[i]]++

  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * histogram[i]

  let sumB = 0, wB = 0, maxVar = 0, thresh = 128
  for (let t = 0; t < 256; t++) {
    wB += histogram[t]
    if (wB === 0) continue
    const wF = gray.length - wB
    if (wF === 0) break
    sumB += t * histogram[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const v = wB * wF * (mB - mF) * (mB - mF)
    if (v > maxVar) { maxVar = v; thresh = t }
  }

  for (let i = 0; i < gray.length; i++) {
    gray[i] = gray[i] > thresh ? 255 : 0
  }
}

/**
 * Morphological erode — cv2.erode(img, kernel, iterations=1)
 * Uses a 3x3 structuring element (minimum filter).
 */
function morphErode(gray: Uint8Array, w: number, h: number): void {
  const src = new Uint8Array(gray)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let min = 255
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const ny = y + ky, nx = x + kx
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            const v = src[ny * w + nx]
            if (v < min) min = v
          }
        }
      }
      gray[y * w + x] = min
    }
  }
}

/**
 * Morphological dilate — cv2.dilate(img, kernel, iterations=1)
 * Uses a 3x3 structuring element (maximum filter).
 */
function morphDilate(gray: Uint8Array, w: number, h: number): void {
  const src = new Uint8Array(gray)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let max = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const ny = y + ky, nx = x + kx
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            const v = src[ny * w + nx]
            if (v > max) max = v
          }
        }
      }
      gray[y * w + x] = max
    }
  }
}

/**
 * Morphological open — cv2.morphologyEx(img, MORPH_OPEN, kernel)
 * = erode then dilate. Removes small bright noise from binary image.
 */
function morphOpen(gray: Uint8Array, w: number, h: number): void {
  morphErode(gray, w, h)
  morphDilate(gray, w, h)
}

/** Ensure black text on white background (invert if mostly black) */
function ensureBlackOnWhite(gray: Uint8Array): void {
  let blackCount = 0
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] === 0) blackCount++
  }
  if (blackCount > gray.length * 0.6) {
    for (let i = 0; i < gray.length; i++) {
      gray[i] = 255 - gray[i]
    }
  }
}

/** Upscale image to target width, return canvas + context + dimensions */
async function upscaleToCanvas(dataUrl: string, targetWidth: number): Promise<{
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number
}> {
  const img = await dataUrlToImage(dataUrl)
  let w = img.width, h = img.height
  if (w < targetWidth) {
    const scale = targetWidth / w
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  return { canvas, ctx, w, h }
}

// =====================================================================
//  Main OCR preprocessing pipelines
// =====================================================================

/**
 * PRIMARY preprocessing — follows the Python FlexibleOCREngine approach:
 *   grayscale → GaussianBlur(3) → adaptiveThreshold(35, 10) → morphOpen
 *
 * Adaptive threshold handles uneven lighting much better than global Otsu.
 */
export async function prepareForOCR_binary(dataUrl: string): Promise<string> {
  const { canvas, ctx, w, h } = await upscaleToCanvas(dataUrl, 2500)
  const imageData = ctx.getImageData(0, 0, w, h)
  const pixelCount = w * h

  // 1. Grayscale
  const gray = toGrayscale(imageData.data, pixelCount)

  // 2. Gaussian blur (denoise + smooth before threshold)
  gaussianBlur3x3(gray, w, h)

  // 3. Adaptive threshold (block_size=35, C=10) — local mean binarization
  adaptiveThreshold(gray, w, h, 35, 10)

  // 4. Morphological open — clean small noise
  morphOpen(gray, w, h)

  // 5. Ensure black text on white
  ensureBlackOnWhite(gray)

  // Write back
  grayToRGBA(gray, imageData.data)
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * SECONDARY preprocessing — global Otsu threshold variant:
 *   grayscale → GaussianBlur(3) → Otsu binarize → morphOpen
 *
 * Works better for well-lit images with consistent background.
 */
export async function prepareForOCR_contrast(dataUrl: string): Promise<string> {
  const { canvas, ctx, w, h } = await upscaleToCanvas(dataUrl, 2500)
  const imageData = ctx.getImageData(0, 0, w, h)
  const pixelCount = w * h

  // 1. Grayscale
  const gray = toGrayscale(imageData.data, pixelCount)

  // 2. Gaussian blur
  gaussianBlur3x3(gray, w, h)

  // 3. Otsu global threshold
  otsuBinarize(gray)

  // 4. Morph open
  morphOpen(gray, w, h)

  // 5. Ensure black text on white
  ensureBlackOnWhite(gray)

  // Write back
  grayToRGBA(gray, imageData.data)
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Rotate a data URL image by the given degrees (90, 180, 270).
 * Used by OCR engine to try different orientations.
 */
export async function rotateDataUrl(dataUrl: string, degrees: number): Promise<string> {
  const img = await dataUrlToImage(dataUrl)
  const canvas = document.createElement('canvas')
  const rad = (degrees * Math.PI) / 180

  if (degrees === 90 || degrees === 270) {
    canvas.width = img.height
    canvas.height = img.width
  } else {
    canvas.width = img.width
    canvas.height = img.height
  }

  const ctx = canvas.getContext('2d')!
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(img, -img.width / 2, -img.height / 2)
  return canvas.toDataURL('image/png')
}

/** Keep original for backward compat */
export async function autoEnhanceImage(dataUrl: string): Promise<string> {
  return prepareForOCR_binary(dataUrl)
}

export { prepareForOCR_binary as prepareForOCR_clean }
export { prepareForOCR_contrast as prepareForOCR_enhanced }

/** Lightweight enhance that keeps colors (for preview display) */
export async function lightEnhanceImage(dataUrl: string): Promise<string> {
  const img = await dataUrlToImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = imageData.data
  const factor = 1.15
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128))
    d[i + 1] = Math.min(255, Math.max(0, factor * (d[i + 1] - 128) + 128))
    d[i + 2] = Math.min(255, Math.max(0, factor * (d[i + 2] - 128) + 128))
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.9)
}
