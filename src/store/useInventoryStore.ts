import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { InventoryItem, Source, AuditEntry } from '../types/inventory'

interface InventoryState {
  items: InventoryItem[]
  audit: AuditEntry[]
  lastActivity: number
  addItem: (barcode: string, quantity: number, source: Source, extra?: { serial?: string; imageDataUrl?: string; branch?: string; cartons?: number; units?: number }) => void
  removeItem: (id: string) => void
  clearAll: () => void
  logAudit: (action: AuditEntry['action'], detail: string) => void
  touchActivity: () => void
  importItems: (items: Omit<InventoryItem, 'id' | 'timestamp'>[]) => number
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      items: [],
      audit: [],
      lastActivity: Date.now(),
      addItem: (barcode, quantity, source, extra) =>
        set((state) => {
          const cartons = extra?.cartons ?? 0
          const units = extra?.units ?? quantity
          const newItem: InventoryItem = {
            id: crypto.randomUUID(),
            barcode,
            quantity,
            cartons,
            units,
            source,
            timestamp: Date.now(),
            serial: extra?.serial,
            imageDataUrl: extra?.imageDataUrl,
            branch: extra?.branch,
          }
          const auditEntry: AuditEntry = {
            id: crypto.randomUUID(),
            action: 'add',
            detail: `${barcode} (x${quantity}) [${source}]${extra?.branch ? ` → ${extra.branch}` : ''}`,
            timestamp: Date.now(),
          }
          return {
            items: [newItem, ...state.items],
            audit: [auditEntry, ...state.audit],
            lastActivity: Date.now(),
          }
        }),
      removeItem: (id) =>
        set((state) => {
          const item = state.items.find((i) => i.id === id)
          const auditEntry: AuditEntry = {
            id: crypto.randomUUID(),
            action: 'delete',
            detail: item ? item.barcode : id,
            timestamp: Date.now(),
          }
          return {
            items: state.items.filter((i) => i.id !== id),
            audit: [auditEntry, ...state.audit],
            lastActivity: Date.now(),
          }
        }),
      clearAll: () =>
        set((state) => {
          const auditEntry: AuditEntry = {
            id: crypto.randomUUID(),
            action: 'clear',
            detail: `مسح ${state.items.length} صنف`,
            timestamp: Date.now(),
          }
          return {
            items: [],
            audit: [auditEntry, ...state.audit],
            lastActivity: Date.now(),
          }
        }),
      logAudit: (action, detail) =>
        set((state) => ({
          audit: [
            { id: crypto.randomUUID(), action, detail, timestamp: Date.now() },
            ...state.audit,
          ],
          lastActivity: Date.now(),
        })),
      touchActivity: () => set({ lastActivity: Date.now() }),
      importItems: (importedItems) => {
        let count = 0
        set((state) => {
          const newItems: InventoryItem[] = importedItems.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          }))
          count = newItems.length
          const auditEntry: AuditEntry = {
            id: crypto.randomUUID(),
            action: 'excel-import',
            detail: `استيراد ${count} صنف من Excel`,
            timestamp: Date.now(),
          }
          return {
            items: [...newItems, ...state.items],
            audit: [auditEntry, ...state.audit],
            lastActivity: Date.now(),
          }
        })
        return count
      },
    }),
    { name: 'smart-inventory-v1' }
  )
)
