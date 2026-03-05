import { useClock } from '../hooks/useClock'
import { useInventoryStore } from '../store/useInventoryStore'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'
import { exportToExcel } from '../utils/exportExcel'

interface HeaderProps {
  onSessionExpired: () => void
}

export default function Header({ onSessionExpired }: HeaderProps) {
  const time = useClock()
  const items = useInventoryStore((s) => s.items)
  const clearAll = useInventoryStore((s) => s.clearAll)
  const logAudit = useInventoryStore((s) => s.logAudit)
  const showToast = useToastStore((s) => s.showToast)
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)

  const handleExport = () => {
    if (items.length === 0) {
      showToast('لا توجد أصناف للتصدير', 'error')
      return
    }
    exportToExcel(items)
    logAudit('export', `تصدير ${items.length} صنف`)
    showToast('تم تصدير الملف بنجاح', 'success')
  }

  const handleClear = () => {
    if (items.length === 0) return
    if (confirm('هل أنت متأكد من مسح جميع الأصناف؟')) {
      clearAll()
      showToast('تم مسح جميع الأصناف', 'info')
    }
  }

  const handleLogout = () => {
    logAudit('logout', `خروج: ${currentUser?.displayName || 'مستخدم'}`)
    logout()
    onSessionExpired()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md px-4 py-3 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-gray-800 text-sm">المخزون الذكي</h1>
          <p className="text-[10px] text-gray-500">
            {currentUser?.displayName || 'مستخدم'}
            {currentUser?.role === 'admin' && <span className="mr-1 text-red-500">(مشرف)</span>}
            <span className="mr-2">{time}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={handleExport}
          className="rounded-lg bg-green-500 px-2.5 py-2 text-xs font-bold text-white transition hover:bg-green-600 active:scale-95 cursor-pointer"
        >
          Excel
        </button>
        <button
          onClick={handleClear}
          className="rounded-lg bg-red-500 px-2.5 py-2 text-xs font-bold text-white transition hover:bg-red-600 active:scale-95 cursor-pointer"
        >
          مسح
        </button>
        <button
          onClick={handleLogout}
          className="rounded-lg bg-gray-500 px-2.5 py-2 text-xs font-bold text-white transition hover:bg-gray-600 active:scale-95 cursor-pointer"
          title="خروج"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  )
}
