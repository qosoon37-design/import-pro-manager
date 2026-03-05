import { useInventoryStore } from '../store/useInventoryStore'
import { useToastStore } from '../store/useToastStore'
import type { Source } from '../types/inventory'

const sourceConfig: Record<Source, { label: string; bg: string; text: string }> = {
  scan: { label: 'باركود', bg: 'bg-blue-100', text: 'text-blue-700' },
  ocr: { label: 'OCR', bg: 'bg-orange-100', text: 'text-orange-700' },
  manual: { label: 'يدوي', bg: 'bg-green-100', text: 'text-green-700' },
  'image-scan': { label: 'صورة-باركود', bg: 'bg-purple-100', text: 'text-purple-700' },
  'image-ocr': { label: 'صورة-OCR', bg: 'bg-pink-100', text: 'text-pink-700' },
  'excel-import': { label: 'Excel', bg: 'bg-teal-100', text: 'text-teal-700' },
}

export default function InventoryTable() {
  const items = useInventoryStore((s) => s.items)
  const removeItem = useInventoryStore((s) => s.removeItem)
  const showToast = useToastStore((s) => s.showToast)

  const handleDelete = (id: string) => {
    removeItem(id)
    showToast('تم حذف الصنف', 'info')
  }

  const formatTime = (ts: number) =>
    new Intl.DateTimeFormat('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(ts))

  return (
    <div className="rounded-2xl bg-white shadow overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <h2 className="font-bold text-gray-800">قائمة الأصناف</h2>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-600">
          {items.length} صنف
        </span>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <svg
            className="mx-auto mb-3 h-16 w-16 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p>لا توجد أصناف بعد</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-xs font-bold text-gray-500">#</th>
                <th className="px-3 py-3 text-xs font-bold text-gray-500">الكود</th>
                <th className="px-3 py-3 text-xs font-bold text-gray-500">كراتين</th>
                <th className="px-3 py-3 text-xs font-bold text-gray-500">وحدات</th>
                <th className="px-3 py-3 text-xs font-bold text-gray-500">الفرع</th>
                <th className="px-3 py-3 text-xs font-bold text-gray-500">المصدر</th>
                <th className="px-3 py-3 text-xs font-bold text-gray-500">الوقت</th>
                <th className="px-3 py-3 text-xs font-bold text-gray-500">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => {
                const src = sourceConfig[item.source]
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2.5 text-sm font-mono font-semibold text-gray-800 max-w-[160px] truncate" title={item.barcode}>
                      {item.imageDataUrl && (
                        <span className="ml-1 inline-block align-middle text-purple-400" title="مرفق صورة">
                          <svg className="inline h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                      )}
                      {item.barcode}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{item.cartons || '-'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 font-bold">{item.units || item.quantity}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{item.branch || '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${src.bg} ${src.text}`}>
                        {src.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatTime(item.timestamp)}</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-100 hover:text-red-600 cursor-pointer"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
