import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppUser, UserRole } from '../types/inventory'

interface AuthState {
  users: AppUser[]
  currentUser: AppUser | null
  login: (username: string, password: string) => boolean
  logout: () => void
  addUser: (username: string, password: string, displayName: string, role: UserRole, defaultBranch?: string) => boolean
  removeUser: (id: string) => void
  updateUserBranch: (id: string, branch: string) => void
}

const DEFAULT_ADMIN: AppUser = {
  id: 'admin-default',
  username: 'admin',
  password: 'admin',
  displayName: 'المشرف',
  role: 'admin',
  createdAt: Date.now(),
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [DEFAULT_ADMIN],
      currentUser: null,
      login: (username, password) => {
        const user = get().users.find(
          (u) => u.username === username && u.password === password
        )
        if (user) {
          set({ currentUser: user })
          return true
        }
        return false
      },
      logout: () => set({ currentUser: null }),
      addUser: (username, password, displayName, role, defaultBranch) => {
        const exists = get().users.some((u) => u.username === username)
        if (exists) return false
        const newUser: AppUser = {
          id: crypto.randomUUID(),
          username,
          password,
          displayName,
          role,
          defaultBranch,
          createdAt: Date.now(),
        }
        set((s) => ({ users: [...s.users, newUser] }))
        return true
      },
      removeUser: (id) => {
        if (id === 'admin-default') return
        set((s) => ({ users: s.users.filter((u) => u.id !== id) }))
      },
      updateUserBranch: (id, branch) => {
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id ? { ...u, defaultBranch: branch } : u
          ),
        }))
      },
    }),
    { name: 'smart-inventory-auth-v1' }
  )
)
