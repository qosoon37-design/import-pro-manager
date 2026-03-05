import { useState, useRef } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useBranchStore } from '../store/useBranchStore'
import { useInventoryStore } from '../store/useInventoryStore'
import { useToastStore } from '../store/useToastStore'
import type { UserRole } from '../types/inventory'
import * as XLSX from 'xlsx'

export default function AdminPanel() {
  const { users, currentUser, addUser, removeUser, updateUserBranch } = useAuthStore()
  const { branches, addBranch, removeBranch } = useBranchStore()
  const { importItems, logAudit } = useInventoryStore()
  const showToast = useToastStore((s) => s.showToast)

  const [tab, setTab] = useState<'branches' | 'users' | 'import'>('branches')
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchCode, setNewBranchCode] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('user')
  const [newUserBranch, setNewUserBranch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<{ barcode: string; cartons: number; units: number }[]>([])
  const [importBranch, setImportBranch] = useState('')

  const isAdmin = currentUser?.role === 'admin'

  const handleAddBranch = () => {
    if (!newBranchName.trim() || !newBranchCode.trim()) {
      showToast('ادخل اسم ورمز الفرع', 'error'); return
    }
    if (addBranch(newBranchName.trim(), newBranchCode.trim())) {
      logAudit('branch-add', newBranchName.trim())
      showToast('تم اضافة الفرع', 'success')
      setNewBranchName(''); setNewBranchCode('')
    } else {
      showToast('الفرع موجود مسبقا', 'error')
    }
  }

  const handleRemoveBranch = (id: string, name: string) => {
    if (!confirm(`حذف الفرع: ${name}؟`)) return
    removeBranch(id)
    logAudit('branch-delete', name)
    showToast('تم حذف الفرع', 'info')
  }

  const handleAddUser = () => {
    if (!newUsername.trim() || !newPassword.trim() || !newDisplayName.trim()) {
      showToast('املأ جميع الحقول', 'error'); return
    }
    if (addUser(newUsername.trim(), newPassword.trim(), newDisplayName.trim(), newRole, newUserBranch || undefined)) {
      logAudit('user-add', newDisplayName.trim())
      showToast('تم اضافة المستخدم', 'success')
      setNewUsername(''); setNewPassword(''); setNewDisplayName(''); setNewRole('user'); setNewUserBranch('')
    } else {
      showToast('اسم المستخدم موجود مسبقا', 'error')
    }
  }

  const handleRemoveUser = (id: string, name: string) => {
    if (id === 'admin-default') { showToast('لا يمكن حذف المشرف الافتراضي', 'error'); return }
    if (!confirm(`حذف المستخدم: ${name}؟`)) return
    removeUser(id)
    logAudit('user-delete', name)
    showToast('تم حذف المستخدم', 'info')
  }

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

        const parsed: { barcode: string; cartons: number; units: number }[] = []
        for (const row of json) {
          // Try common column names
          const barcode = String(
            row['barcode'] ?? row['Barcode'] ?? row['BARCODE'] ??
            row['code'] ?? row['Code'] ?? row['CODE'] ??
            row['كود'] ?? row['الكود'] ?? row['رمز'] ??
            row['item'] ?? row['Item'] ?? row['ITEM'] ??
            row['ITEM NO'] ?? row['item_no'] ?? row['ItemNo'] ?? ''
          ).trim()

          if (!barcode) continue

          const cartons = parseInt(String(
            row['cartons'] ?? row['Cartons'] ?? row['CARTONS'] ??
            row['كراتين'] ?? row['عدد الكراتين'] ?? row['carton'] ?? 0
          ), 10) || 0

          const units = parseInt(String(
            row['units'] ?? row['Units'] ?? row['UNITS'] ??
            row['وحدات'] ?? row['الكمية'] ?? row['qty'] ?? row['QTY'] ??
            row['Qty'] ?? row['quantity'] ?? row['Quantity'] ?? 0
          ), 10) || 0

          parsed.push({ barcode, cartons, units: units || cartons })
        }

        setImportPreview(parsed)
        if (parsed.length > 0) {
          showToast(`تم قراءة ${parsed.length} صنف من الملف`, 'success')
        } else {
          showToast('لم يتم العثور على بيانات صالحة', 'error')
        }
      } catch {
        showToast('فشل في قراءة ملف Excel', 'error')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImportConfirm = () => {
    if (importPreview.length === 0) return
    const branch = importBranch || undefined
    const branchObj = branches.find((b) => b.id === branch)
    const items = importPreview.map((p) => ({
      barcode: p.barcode,
      quantity: p.units || p.cartons || 1,
      cartons: p.cartons,
      units: p.units,
      source: 'excel-import' as const,
      branch: branchObj?.name,
    }))
    const count = importItems(items)
    showToast(`تم استيراد ${count} صنف`, 'success')
    setImportPreview([])
  }

  const roleLabels: Record<UserRole, string> = { admin: 'مشرف', supervisor: 'مراقب', user: 'مستخدم' }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-6 text-center">
        <p className="text-yellow-800 font-bold">هذه الصفحة متاحة للمشرفين فقط</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="grid grid-cols-3 gap-2">
        {([['branches', 'الفروع'], ['users', 'المستخدمين'], ['import', 'استيراد Excel']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded-xl py-2.5 text-sm font-bold transition cursor-pointer ${tab === key ? 'bg-indigo-600 text-white shadow' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Branches */}
      {tab === 'branches' && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            ادارة الفروع
          </h3>
          <div className="flex gap-2">
            <input type="text" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="اسم الفرع" className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" />
            <input type="text" value={newBranchCode} onChange={(e) => setNewBranchCode(e.target.value)}
              placeholder="الرمز" className="w-24 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200" dir="ltr" />
            <button onClick={handleAddBranch}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 cursor-pointer">+</button>
          </div>
          {branches.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-4">لا توجد فروع — اضف فرع اولا</p>
          ) : (
            <div className="space-y-2">
              {branches.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div>
                    <span className="font-bold text-sm text-gray-800">{b.name}</span>
                    <span className="mr-2 text-xs text-gray-400 font-mono">{b.code}</span>
                  </div>
                  <button onClick={() => handleRemoveBranch(b.id, b.name)}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-100 hover:text-red-600 cursor-pointer">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            ادارة المستخدمين
          </h3>
          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="الاسم" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                <option value="user">مستخدم</option>
                <option value="supervisor">مراقب</option>
                <option value="admin">مشرف</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                placeholder="اسم المستخدم" dir="ltr" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="كلمة المرور" dir="ltr" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            </div>
            <div className="flex gap-2">
              <select value={newUserBranch} onChange={(e) => setNewUserBranch(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                <option value="">الفرع الافتراضي (اختياري)</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button onClick={handleAddUser}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 cursor-pointer">اضافة</button>
            </div>
          </div>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-800">{u.displayName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'supervisor' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                    {roleLabels[u.role]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select value={u.defaultBranch || ''} onChange={(e) => updateUserBranch(u.id, e.target.value)}
                    className="rounded border border-gray-200 px-2 py-1 text-xs outline-none">
                    <option value="">بدون فرع</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {u.id !== 'admin-default' && (
                    <button onClick={() => handleRemoveUser(u.id, u.displayName)}
                      className="rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-600 cursor-pointer">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Excel Import */}
      {tab === 'import' && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            استيراد ارصدة من Excel
          </h3>
          <p className="text-xs text-gray-500">
            الأعمدة المطلوبة: <code className="bg-gray-100 px-1 rounded">barcode/code/كود</code>, <code className="bg-gray-100 px-1 rounded">cartons/كراتين</code>, <code className="bg-gray-100 px-1 rounded">units/qty/الكمية</code>
          </p>
          <div className="flex gap-2">
            <select value={importBranch} onChange={(e) => setImportBranch(e.target.value)}
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-400">
              <option value="">الفرع المستهدف (اختياري)</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 cursor-pointer">
              رفع ملف Excel
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />

          {importPreview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-gray-600">معاينة ({importPreview.length} صنف):</p>
              <div className="max-h-[200px] overflow-y-auto rounded-xl border border-gray-200">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-xs font-bold text-gray-500">الكود</th>
                      <th className="px-3 py-2 text-xs font-bold text-gray-500">كراتين</th>
                      <th className="px-3 py-2 text-xs font-bold text-gray-500">وحدات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importPreview.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-mono font-bold text-gray-800">{row.barcode}</td>
                        <td className="px-3 py-1.5 text-gray-600">{row.cartons}</td>
                        <td className="px-3 py-1.5 text-gray-600">{row.units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button onClick={handleImportConfirm}
                  className="flex-1 rounded-xl bg-green-600 py-2.5 font-bold text-white hover:bg-green-700 cursor-pointer">
                  تأكيد الاستيراد ({importPreview.length} صنف)
                </button>
                <button onClick={() => setImportPreview([])}
                  className="rounded-xl bg-gray-200 px-4 py-2.5 font-bold text-gray-700 hover:bg-gray-300 cursor-pointer">
                  الغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
