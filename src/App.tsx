import { useState, useCallback } from 'react'
import type { ActiveTab } from './types/inventory'
import { useInventoryStore } from './store/useInventoryStore'
import { useAuthStore } from './store/useAuthStore'
import { useToastStore } from './store/useToastStore'
import { useSessionTimeout } from './hooks/useSessionTimeout'
import SplashScreen from './components/SplashScreen'
import Header from './components/Header'
import ScannerPanel from './components/ScannerPanel'
import OCRPanel from './components/OCRPanel'
import ManualEntry from './components/ManualEntry'
import ImageUploadPanel from './components/ImageUploadPanel'
import AdminPanel from './components/AdminPanel'
import InventoryTable from './components/InventoryTable'
import AuditLog from './components/AuditLog'
import Toast from './components/Toast'

const tabs: { key: ActiveTab; label: string; color: string; adminOnly?: boolean }[] = [
  { key: 'scan', label: 'باركود', color: 'blue' },
  { key: 'ocr', label: 'OCR كاميرا', color: 'cyan' },
  { key: 'image', label: 'رفع صورة', color: 'purple' },
  { key: 'manual', label: 'يدوي', color: 'green' },
  { key: 'admin', label: 'الادارة', color: 'indigo', adminOnly: true },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('image')
  const logAudit = useInventoryStore((s) => s.logAudit)
  const showToast = useToastStore((s) => s.showToast)
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)

  const handleSessionExpired = useCallback(() => {
    logAudit('logout', 'انتهاء الجلسة (30 دقيقة)')
    showToast('انتهت الجلسة بسبب عدم النشاط', 'warning')
    logout()
  }, [logAudit, showToast, logout])

  useSessionTimeout(handleSessionExpired)

  const handleEnter = () => {
    logAudit('login', `دخول: ${currentUser?.displayName || 'مستخدم'}`)
  }

  const handleLogout = () => {
    logout()
  }

  // Show login if not authenticated
  if (!currentUser) {
    return (
      <>
        <SplashScreen onEnter={handleEnter} />
        <Toast />
      </>
    )
  }

  const isAdmin = currentUser.role === 'admin'
  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin)

  return (
    <div className="min-h-screen bg-gray-100">
      <Header onSessionExpired={handleLogout} />

      <main className="mx-auto max-w-6xl space-y-4 p-4">
        {/* Scanner / OCR / Image / Manual / Admin Card */}
        <div className="rounded-2xl bg-white p-4 shadow">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-gray-800">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            أدوات الإدخال
          </h2>

          {/* Tab navigation */}
          <div className={`mb-4 grid gap-2`} style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}>
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.key
              const activeStyles: Record<string, string> = {
                blue: 'bg-blue-600 text-white shadow-md',
                cyan: 'bg-cyan-600 text-white shadow-md',
                green: 'bg-green-600 text-white shadow-md',
                purple: 'bg-purple-600 text-white shadow-md',
                indigo: 'bg-indigo-600 text-white shadow-md',
              }
              const inactiveStyles: Record<string, string> = {
                blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
                cyan: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
                green: 'bg-green-50 text-green-700 hover:bg-green-100',
                purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
                indigo: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
              }
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-xl py-2.5 text-sm font-bold transition cursor-pointer ${
                    isActive ? activeStyles[tab.color] : inactiveStyles[tab.color]
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div>
            {activeTab === 'scan' && <ScannerPanel />}
            {activeTab === 'ocr' && <OCRPanel />}
            {activeTab === 'image' && <ImageUploadPanel />}
            {activeTab === 'manual' && <ManualEntry />}
            {activeTab === 'admin' && isAdmin && <AdminPanel />}
          </div>
        </div>

        {/* Inventory Table */}
        <InventoryTable />

        {/* Audit Log */}
        <AuditLog />
      </main>

      <Toast />
    </div>
  )
}
