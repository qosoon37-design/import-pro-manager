export interface OCRFilter {
  id: string
  label: string
  icon: string
  description: string
  pattern: RegExp
}

/** Built-in filter presets */
export const PRESET_FILTERS: OCRFilter[] = [
  {
    id: 'all',
    label: 'الكل',
    icon: '📋',
    description: 'عرض جميع النصوص بدون فلترة',
    pattern: /./,
  },
  {
    id: 'numbers',
    label: 'أرقام فقط',
    icon: '#',
    description: 'سطور تحتوي أرقام (باركود، كميات، أكواد)',
    pattern: /\d{3,}/,
  },
  {
    id: 'arabic',
    label: 'نص عربي',
    icon: 'ع',
    description: 'سطور تحتوي نص عربي (أسماء منتجات)',
    pattern: /[\u0600-\u06FF]{2,}/,
  },
  {
    id: 'english',
    label: 'نص إنجليزي',
    icon: 'A',
    description: 'سطور تحتوي نص إنجليزي',
    pattern: /[a-zA-Z]{3,}/,
  },
  {
    id: 'dates',
    label: 'تواريخ',
    icon: '📅',
    description: 'تواريخ بأشكال مختلفة (2024/01/15, 15-01-2024, EXP)',
    pattern: /(\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4})|(EXP|MFG|تاريخ|انتاج|انتهاء)/i,
  },
  {
    id: 'weights',
    label: 'أوزان/مقاسات',
    icon: '⚖',
    description: 'قيم بوحدات (kg, g, ml, cm, م، كجم)',
    pattern: /\d+\.?\d*\s*(kg|g|ml|l|cm|mm|m|كجم|جم|لتر|مل|سم)/i,
  },
]

/** Create a custom filter from user regex input */
export function createCustomFilter(regexStr: string): OCRFilter | null {
  try {
    const pattern = new RegExp(regexStr, 'i')
    return {
      id: 'custom',
      label: 'مخصص',
      icon: '🔍',
      description: regexStr,
      pattern,
    }
  } catch {
    return null
  }
}

/** Apply a filter to OCR lines, return only matching lines */
export function applyFilter(lines: string[], filter: OCRFilter): string[] {
  if (filter.id === 'all') return lines
  return lines.filter((line) => filter.pattern.test(line))
}

export interface OCRRegion {
  id: string
  text: string
  confidence: number
  bbox: { x: number; y: number; w: number; h: number }
}

/** Group Tesseract blocks into distinct regions (each block = potential carton) */
export function extractRegions(tesseractData: Tesseract.Page): OCRRegion[] {
  const blocks = tesseractData.blocks ?? []
  return blocks
    .filter((block) => block.text.trim().length > 1)
    .map((block, idx) => ({
      id: `region-${idx}`,
      text: block.text.trim(),
      confidence: block.confidence,
      bbox: {
        x: block.bbox.x0,
        y: block.bbox.y0,
        w: block.bbox.x1 - block.bbox.x0,
        h: block.bbox.y1 - block.bbox.y0,
      },
    }))
}

/** Smart text cleanup: remove noise, fix common OCR errors */
export function cleanOCRText(text: string): string {
  return text
    .replace(/[|}{[\]]/g, '')
    .replace(/\s{3,}/g, '  ')
    .replace(/([^\S\n])*\n([^\S\n])*/g, '\n')
    .replace(/^\s*[-—_=.]{3,}\s*$/gm, '')
    .trim()
}

/** Parsed carton label data */
export interface CartonData {
  brand: string
  itemNo: string
  qty: string
  qtyNum: number
  origin: string
  rawText: string
}

/**
 * Parse structured carton data from OCR text.
 * Looks for patterns like:
 *   RRR
 *   ITEM NO: A-10639
 *   QTY: 60 PCS
 *   MADE IN CHINA
 */
export function parseCartonText(text: string): CartonData {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)

  let brand = ''
  let itemNo = ''
  let qty = ''
  let qtyNum = 0
  let origin = ''

  for (const line of lines) {
    const upper = line.toUpperCase()

    // ITEM NO / ITEM NUMBER / I.NO / ITEM#
    if (!itemNo) {
      const itemMatch = line.match(/ITEM\s*(?:NO|NUMBER|#|N[O0])?\s*[.:;]?\s*(.+)/i)
      if (itemMatch) {
        itemNo = itemMatch[1].trim().replace(/^[.:;\s]+/, '')
        continue
      }
      // Also match standalone codes like "A-10639" on their own line
      const codeMatch = line.match(/^([A-Z]{1,3}[-\s]?\d{3,}[A-Z0-9-]*)$/i)
      if (codeMatch && !brand) {
        // Could be item code if it has numbers
        itemNo = codeMatch[1].trim()
        continue
      }
    }

    // QTY / QUANTITY
    if (!qty) {
      const qtyMatch = line.match(/QTY\s*[.:;]?\s*(\d+)\s*(PCS|SETS?|PIECES?|قطعة|طقم)?/i)
      if (qtyMatch) {
        qtyNum = parseInt(qtyMatch[1], 10)
        qty = `${qtyNum} ${(qtyMatch[2] || 'PCS').toUpperCase()}`
        continue
      }
      // Also look for standalone number + PCS
      const pcsMatch = line.match(/^(\d+)\s*(PCS|SETS?|PIECES?|قطعة|طقم)\s*$/i)
      if (pcsMatch) {
        qtyNum = parseInt(pcsMatch[1], 10)
        qty = `${qtyNum} ${pcsMatch[2].toUpperCase()}`
        continue
      }
    }

    // MADE IN ...
    if (!origin) {
      const originMatch = line.match(/MADE\s+IN\s+(.+)/i)
      if (originMatch) {
        origin = originMatch[1].trim()
        continue
      }
    }

    // Brand: usually a short uppercase word at the top (2-8 chars, all letters)
    if (!brand && /^[A-Z]{2,10}$/.test(upper) && !upper.match(/^(PCS|QTY|ITEM|MADE|SETS?)$/)) {
      brand = upper
      continue
    }
  }

  return {
    brand,
    itemNo,
    qty,
    qtyNum,
    origin,
    rawText: text,
  }
}

/**
 * Find multiple cartons in a single OCR text output.
 * Groups text blocks by looking for repeated patterns (ITEM NO, QTY).
 */
export function parseMultipleCartons(text: string): CartonData[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)

  // Split into chunks whenever we see a brand-like line followed by item/qty patterns
  const chunks: string[][] = []
  let current: string[] = []

  for (const line of lines) {
    const upper = line.toUpperCase()
    // A new carton block likely starts with a brand name or ITEM NO line
    const isNewBlock =
      (/^[A-Z]{2,10}$/.test(upper) && !upper.match(/^(PCS|QTY|ITEM|MADE|SETS?)$/)) ||
      /ITEM\s*(?:NO|NUMBER|#|N[O0])?\s*[.:;]?/i.test(line)

    if (isNewBlock && current.length > 0) {
      // Check if previous chunk has meaningful data
      const prevText = current.join('\n')
      if (/ITEM|QTY|\d{3,}/i.test(prevText)) {
        chunks.push([...current])
        current = []
      }
    }
    current.push(line)
  }
  if (current.length > 0) {
    chunks.push(current)
  }

  // Parse each chunk
  const results = chunks
    .map((chunk) => parseCartonText(chunk.join('\n')))
    .filter((c) => c.itemNo || c.qtyNum > 0 || c.brand)

  // If no structured results, return a single entry with raw text
  if (results.length === 0 && text.trim().length > 0) {
    return [{ brand: '', itemNo: '', qty: '', qtyNum: 1, origin: '', rawText: text.trim() }]
  }

  return results
}
