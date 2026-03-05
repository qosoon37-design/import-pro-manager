import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Branch } from '../types/inventory'

interface BranchState {
  branches: Branch[]
  selectedBranch: string
  addBranch: (name: string, code: string) => boolean
  removeBranch: (id: string) => void
  setSelectedBranch: (id: string) => void
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: [],
      selectedBranch: '',
      addBranch: (name, code) => {
        const exists = get().branches.some(
          (b) => b.code === code || b.name === name
        )
        if (exists) return false
        const branch: Branch = {
          id: crypto.randomUUID(),
          name,
          code,
          createdAt: Date.now(),
        }
        set((s) => ({
          branches: [...s.branches, branch],
          selectedBranch: s.selectedBranch || branch.id,
        }))
        return true
      },
      removeBranch: (id) => {
        set((s) => ({
          branches: s.branches.filter((b) => b.id !== id),
          selectedBranch: s.selectedBranch === id ? '' : s.selectedBranch,
        }))
      },
      setSelectedBranch: (id) => set({ selectedBranch: id }),
    }),
    { name: 'smart-inventory-branches-v1' }
  )
)
