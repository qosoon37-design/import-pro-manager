import { useState } from 'react'
import { useInventoryStore } from '../store/useInventoryStore'
import { useToastStore } from '../store/useToastStore'

export default function ManualEntry() {
  const [barcode, setBarcode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [serial, setSerial] = useState('')
  const addItem = useInventoryStore((s) => s.addItem)
  const showToast = useToastStore((s) => s.showToast)

  const handleAdd = () => {
    const code = barcode.trim()
    if (!code) {
      showToast('أدخل الباركود أو النص', 'error')
      return
    }
    if (quantity < 1) {
      showToast('الكمية يجب أن تكون 1 على الأقل', 'error')
      return
    }
    addItem(code, quantity, 'manual', { serial: serial.trim() || undefined })
    showToast(`تمت إضافة: ${code}`, 'success')
    setBarcode('')
    setQuantity(1)
    setSerial('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-700 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        إدخال يدوي
      </h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="أدخل الباركود يدوياً"
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
        />
        <input
          type="text"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="رقم تسلسلي (اختياري)"
          className="w-40 rounded-xl border border-gray-300 px-3 py-2 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
        />
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          min={1}
          className="w-20 rounded-xl border border-gray-300 px-3 py-2 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
        />
        <button
          onClick={handleAdd}
          className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700 active:scale-95 cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  )
}
