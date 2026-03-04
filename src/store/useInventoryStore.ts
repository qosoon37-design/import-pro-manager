import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { InventoryItem, Source, AuditEntry } from '../types/inventory'

interface InventoryState {
  items: InventoryItem[]
  audit: AuditEntry[]
  lastActivity: number
  addItem: (barcode: string, quantity: number, source: Source, extra?: { serial?: string; imageDataUrl?: string }) => void
  removeItem: (id: string) => void
  clearAll: () => void
  logAudit: (action: AuditEntry['action'], detail: string) => void
  touchActivity: () => void
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      items: [],
      audit: [],
      lastActivity: Date.now(),
      addItem: (barcode, quantity, source, extra) =>
        set((state) => {
          const newItem: InventoryItem = {
            id: crypto.randomUUID(),
            barcode,
            quantity,
            source,
            timestamp: Date.now(),
            serial: extra?.serial,
            imageDataUrl: extra?.imageDataUrl,
          }
          const auditEntry: AuditEntry = {
            id: crypto.randomUUID(),
            action: 'add',
            detail: `${barcode} (x${quantity}) [${source}]`,
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
    }),
    { name: 'smart-inventory-v1' }
  )
)
