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

export async function autoEnhanceImage(dataUrl: string): Promise<string> {
  const img = await dataUrlToImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(img, 0, 0)

  // Apply basic contrast enhancement
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const factor = 1.2 // contrast factor

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128))
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128))
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128))
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.9)
}
