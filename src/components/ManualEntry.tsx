import { useState } from 'react'
import { useInventoryStore } from '../store/useInventoryStore'
import { useBranchStore } from '../store/useBranchStore'
import { useToastStore } from '../store/useToastStore'

export default function ManualEntry() {
  const [barcode, setBarcode] = useState('')
  const [cartons, setCartons] = useState(1)
  const [units, setUnits] = useState(1)
  const [serial, setSerial] = useState('')
  const addItem = useInventoryStore((s) => s.addItem)
  const showToast = useToastStore((s) => s.showToast)
  const { branches, selectedBranch } = useBranchStore()
  const [targetBranch, setTargetBranch] = useState(selectedBranch)

  const handleAdd = () => {
    const code = barcode.trim()
    if (!code) {
      showToast('أدخل الباركود أو النص', 'error')
      return
    }
    if (units < 1) {
      showToast('الكمية يجب أن تكون 1 على الأقل', 'error')
      return
    }
    const branchObj = branches.find((b) => b.id === targetBranch)
    addItem(code, units, 'manual', {
      serial: serial.trim() || undefined,
      branch: branchObj?.name,
      cartons,
      units,
    })
    showToast(`تمت إضافة: ${code} (${cartons} كرتون / ${units} وحدة)`, 'success')
    setBarcode('')
    setCartons(1)
    setUnits(1)
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

      {/* Branch selector */}
      {branches.length > 0 && (
        <select value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)}
          className="w-full rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-bold text-green-700 outline-none focus:border-green-400">
          <option value="">الفرع المستهدف</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
        </select>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="كود المنتج (مثال: A-10680)"
          dir="ltr"
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
        />
        <input
          type="text"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="رقم تسلسلي (اختياري)"
          className="w-36 rounded-xl border border-gray-300 px-3 py-2 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
        />
      </div>
      <div className="flex gap-2 items-center">
        <div className="flex-1 flex items-center gap-1">
          <label className="text-xs font-bold text-gray-500 w-14">كراتين:</label>
          <input
            type="number"
            value={cartons}
            onChange={(e) => setCartons(Math.max(0, parseInt(e.target.value) || 0))}
            min={0}
            className="w-20 rounded-xl border border-gray-300 px-3 py-2 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
          />
        </div>
        <div className="flex-1 flex items-center gap-1">
          <label className="text-xs font-bold text-gray-500 w-14">وحدات:</label>
          <input
            type="number"
            value={units}
            onChange={(e) => setUnits(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            className="w-20 rounded-xl border border-gray-300 px-3 py-2 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
          />
        </div>
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
