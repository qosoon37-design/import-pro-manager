import type { InventoryItem } from '../types/inventory'
import * as XLSX from 'xlsx'

export function exportToExcel(items: InventoryItem[]) {
  const sourceLabels: Record<string, string> = {
    scan: 'باركود',
    ocr: 'OCR',
    manual: 'يدوي',
    'image-scan': 'صورة-باركود',
    'image-ocr': 'صورة-OCR',
    'excel-import': 'Excel',
  }

  const data = items.map((item, index) => ({
    'الرقم': index + 1,
    'الكود': item.barcode,
    'الرقم التسلسلي': item.serial || '-',
    'كراتين': item.cartons || 0,
    'وحدات': item.units || item.quantity,
    'الفرع': item.branch || '-',
    'المصدر': sourceLabels[item.source] || item.source,
    'التاريخ والوقت': new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(item.timestamp)),
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 14 },
    { wch: 22 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'المخزون')

  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `مخزون_${today}.xlsx`)
}
