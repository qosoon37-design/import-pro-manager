import { useState } from 'react'
import { useInventoryStore } from '../store/useInventoryStore'

const actionLabels: Record<string, string> = {
  add: 'إضافة',
  delete: 'حذف',
  clear: 'مسح الكل',
  export: 'تصدير',
  login: 'دخول',
  logout: 'خروج',
  'image-upload': 'رفع صورة',
  'branch-add': 'فرع جديد',
  'branch-delete': 'حذف فرع',
  'user-add': 'مستخدم جديد',
  'user-delete': 'حذف مستخدم',
  'excel-import': 'استيراد Excel',
}

const actionColors: Record<string, string> = {
  add: 'bg-green-100 text-green-700',
  delete: 'bg-red-100 text-red-700',
  clear: 'bg-red-100 text-red-700',
  export: 'bg-blue-100 text-blue-700',
  login: 'bg-gray-100 text-gray-700',
  logout: 'bg-gray-100 text-gray-700',
  'image-upload': 'bg-purple-100 text-purple-700',
  'branch-add': 'bg-indigo-100 text-indigo-700',
  'branch-delete': 'bg-red-100 text-red-700',
  'user-add': 'bg-indigo-100 text-indigo-700',
  'user-delete': 'bg-red-100 text-red-700',
  'excel-import': 'bg-teal-100 text-teal-700',
}

export default function AuditLog() {
  const audit = useInventoryStore((s) => s.audit)
  const [expanded, setExpanded] = useState(false)

  const displayItems = expanded ? audit : audit.slice(0, 10)

  const formatTime = (ts: number) =>
    new Intl.DateTimeFormat('ar-SA', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(ts))

  return (
    <div className="rounded-2xl bg-white shadow overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          سجل العمليات
        </h2>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-600">
          {audit.length} عملية
        </span>
      </div>

      {audit.length === 0 ? (
        <div className="p-6 text-center text-gray-400 text-sm">
          لا توجد عمليات مسجلة
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {displayItems.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${actionColors[entry.action] || 'bg-gray-100 text-gray-700'}`}>
                {actionLabels[entry.action] || entry.action}
              </span>
              <span className="flex-1 truncate text-sm text-gray-600">{entry.detail}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(entry.timestamp)}</span>
            </div>
          ))}
          {audit.length > 10 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full py-2.5 text-center text-sm font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            >
              {expanded ? 'عرض أقل' : `عرض الكل (${audit.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
