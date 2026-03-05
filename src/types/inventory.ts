export type Source = 'scan' | 'ocr' | 'manual' | 'image-scan' | 'image-ocr' | 'excel-import'

export interface InventoryItem {
  id: string
  barcode: string
  quantity: number
  cartons: number
  units: number
  source: Source
  timestamp: number
  serial?: string
  imageDataUrl?: string
  branch?: string
}

export type ActiveTab = 'scan' | 'ocr' | 'manual' | 'image' | 'admin'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

export interface AuditEntry {
  id: string
  action: 'add' | 'delete' | 'clear' | 'export' | 'login' | 'logout' | 'image-upload' | 'branch-add' | 'branch-delete' | 'user-add' | 'user-delete' | 'excel-import'
  detail: string
  timestamp: number
}

export interface Branch {
  id: string
  name: string
  code: string
  createdAt: number
}

export type UserRole = 'admin' | 'supervisor' | 'user'

export interface AppUser {
  id: string
  username: string
  password: string
  displayName: string
  role: UserRole
  defaultBranch?: string
  createdAt: number
}

export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
