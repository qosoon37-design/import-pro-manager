export type Source = 'scan' | 'ocr' | 'manual' | 'image-scan' | 'image-ocr'

export interface InventoryItem {
  id: string
  barcode: string
  quantity: number
  source: Source
  timestamp: number
  serial?: string
  imageDataUrl?: string
}

export type ActiveTab = 'scan' | 'ocr' | 'manual' | 'image'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

export interface AuditEntry {
  id: string
  action: 'add' | 'delete' | 'clear' | 'export' | 'login' | 'logout' | 'image-upload'
  detail: string
  timestamp: number
}

export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
