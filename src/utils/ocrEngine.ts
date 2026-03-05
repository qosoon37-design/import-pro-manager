import Tesseract from 'tesseract.js'
import { prepareForOCR_binary, prepareForOCR_contrast, rotateDataUrl } from './imageUtils'

export interface CartonData {
  brand: string
  itemNo: string
  qty: string
  qtyNum: number
  origin: string
  rawText: string
}

export interface OCRResult {
  cartons: CartonData[]
  rawText: string
  confidence: number
}

/**
 * Create a Tesseract worker with optimal settings for carton labels.
 * Uses PSM 6 (single uniform block) + --oem 3 (LSTM) matching Python code.
 */
async function createOCRWorker(): Promise<Tesseract.Worker> {
  const worker = await Tesseract.createWorker('eng')
  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.:/ ,#',
    preserve_interword_spaces: '1',
  })
  return worker
}

/** Run OCR on a single image and return parsed result */
async function ocrAndParse(worker: Tesseract.Worker, imgDataUrl: string): Promise<{
  cartons: CartonData[]; text: string; confidence: number; score: number
}> {
  const result = await worker.recognize(imgDataUrl)
  const text = result.data.text
  const confidence = result.data.confidence
  const cartons = parseAllCartons(text)
  const score = scoreCartons(cartons, confidence)
  return { cartons, text, confidence, score }
}

/**
 * Multi-pass OCR engine optimized for carton labels.
 * Follows the Python FlexibleOCREngine approach:
 *   Pass 1: Adaptive threshold preprocessing + PSM 6 (0 degrees)
 *   Pass 2: Otsu threshold preprocessing + PSM 6 (0 degrees)
 *   Pass 3: If no items found, try 180 rotation (upside-down labels)
 *   Pass 4: If still nothing, try 90/270 rotation
 * Returns whichever pass extracts the most structured data.
 */
export async function runDualPassOCR(
  dataUrl: string,
  onProgress?: (pct: number, label: string) => void
): Promise<OCRResult> {
  onProgress?.(2, 'تجهيز الصورة...')

  // Prepare both preprocessing variants in parallel
  const [adaptiveImg, otsuImg] = await Promise.all([
    prepareForOCR_binary(dataUrl),
    prepareForOCR_contrast(dataUrl),
  ])

  onProgress?.(12, 'تهيئة المحرك...')

  const worker = await createOCRWorker()

  // --- Pass 1: Adaptive threshold (primary) ---
  onProgress?.(18, 'تحليل (تكيفي)...')
  const r1 = await ocrAndParse(worker, adaptiveImg)

  // --- Pass 2: Otsu threshold (secondary) ---
  onProgress?.(42, 'تحليل (أوتسو)...')
  const r2 = await ocrAndParse(worker, otsuImg)

  // Pick best so far
  let best = r1.score >= r2.score ? r1 : r2
  const hasItems = best.cartons.some((c) => c.itemNo)

  // --- Pass 3: Try 180 rotation if no item numbers found ---
  if (!hasItems) {
    onProgress?.(60, 'تجربة دوران 180...')
    const rotated180 = await rotateDataUrl(adaptiveImg, 180)
    const r3 = await ocrAndParse(worker, rotated180)
    if (r3.score > best.score) best = r3

    // --- Pass 4: Try 90/270 if still nothing ---
    if (!best.cartons.some((c) => c.itemNo)) {
      onProgress?.(72, 'تجربة دوران 90...')
      const rotated90 = await rotateDataUrl(adaptiveImg, 90)
      const r4 = await ocrAndParse(worker, rotated90)
      if (r4.score > best.score) best = r4

      if (!best.cartons.some((c) => c.itemNo)) {
        onProgress?.(84, 'تجربة دوران 270...')
        const rotated270 = await rotateDataUrl(adaptiveImg, 270)
        const r5 = await ocrAndParse(worker, rotated270)
        if (r5.score > best.score) best = r5
      }
    }
  }

  await worker.terminate()
  onProgress?.(100, 'تم')

  return { cartons: best.cartons, rawText: best.text, confidence: best.confidence }
}

/** Score carton extraction quality */
function scoreCartons(cartons: CartonData[], confidence: number): number {
  let score = 0
  for (const c of cartons) {
    if (c.itemNo) score += 10
    if (c.qtyNum > 0) score += 5
    if (c.brand) score += 2
    if (c.origin) score += 1
  }
  score += confidence / 100
  return score
}

/**
 * Single-pass OCR (faster, for camera captures).
 * Uses adaptive threshold + PSM 6.
 */
export async function runSinglePassOCR(
  dataUrl: string,
  onProgress?: (pct: number) => void
): Promise<OCRResult> {
  onProgress?.(5)
  const binaryImg = await prepareForOCR_binary(dataUrl)
  onProgress?.(15)

  const worker = await createOCRWorker()
  onProgress?.(25)

  const result = await worker.recognize(binaryImg)
  await worker.terminate()

  onProgress?.(90)
  const cartons = parseAllCartons(result.data.text)
  onProgress?.(100)
  return { cartons, rawText: result.data.text, confidence: result.data.confidence }
}

// =====================================================================
//  Text parsing — extract structured carton data from OCR output
// =====================================================================

function parseAllCartons(text: string): CartonData[] {
  const cleaned = text
    .replace(/[|}{[\]~`]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()

  if (!cleaned) return []

  const lines = cleaned.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)

  // Global scan for all item numbers
  const allItemNos = extractAllItemNumbers(cleaned)
  const allQtys = extractAllQuantities(cleaned)

  if (allItemNos.length > 0) {
    const results: CartonData[] = []
    for (let i = 0; i < allItemNos.length; i++) {
      const qtyData = allQtys[i] || allQtys[0] || { qtyNum: 0, qty: '' }
      results.push({
        brand: extractBrand(lines),
        itemNo: allItemNos[i],
        qty: qtyData.qty,
        qtyNum: qtyData.qtyNum,
        origin: extractOrigin(cleaned),
        rawText: cleaned,
      })
    }
    const seen = new Set<string>()
    return results.filter((c) => {
      if (seen.has(c.itemNo)) return false
      seen.add(c.itemNo)
      return true
    })
  }

  // Fallback: block-based parsing
  const blocks: string[][] = []
  let currentBlock: string[] = []

  for (const line of lines) {
    const isNewCarton = isCartonStart(line, currentBlock)
    if (isNewCarton && currentBlock.length > 0) {
      blocks.push([...currentBlock])
      currentBlock = []
    }
    currentBlock.push(line)
  }
  if (currentBlock.length > 0) blocks.push(currentBlock)

  const results: CartonData[] = []
  for (const block of blocks) {
    const carton = parseCartonBlock(block)
    if (carton.itemNo || carton.qtyNum > 0) results.push(carton)
  }

  if (results.length === 0 && lines.length > 0) {
    const carton = parseCartonBlock(lines)
    if (carton.itemNo || carton.qtyNum > 0) {
      results.push(carton)
    } else {
      results.push({
        brand: '', itemNo: '', qty: '', qtyNum: 1, origin: '',
        rawText: cleaned,
      })
    }
  }

  return results
}

function extractAllItemNumbers(text: string): string[] {
  const patterns = [
    /ITEM\s*N[O0]?\s*[.:;]?\s*([A-Z][-]?\d{2,}[-A-Z0-9]*)/gi,
    /N[O0]\s*[.:;]\s*([A-Z][-]?\d{2,}[-A-Z0-9]*)/gi,
    /[ILTJ1][ILTJ1]?EM\s*N[O0]?\s*[.:;]?\s*([A-Z][-]?\d{2,}[-A-Z0-9]*)/gi,
    /\b([A-Z][-]\d{2,}(?:[-]\d+)?)\b/g,
  ]

  const found: string[] = []
  const seen = new Set<string>()

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const normalized = normalizeItemNo(match[1])
      if (normalized.length >= 3 && !seen.has(normalized)) {
        seen.add(normalized)
        found.push(normalized)
      }
    }
  }
  return found
}

function extractAllQuantities(text: string): { qtyNum: number; qty: string }[] {
  const results: { qtyNum: number; qty: string }[] = []
  const pattern = /[QO][TI][YV]\s*[.:;]?\s*(\d+)\s*(PCS|SETS?|PIECES?|PC)?/gi
  let match
  while ((match = pattern.exec(text)) !== null) {
    const num = parseInt(match[1], 10)
    const unit = (match[2] || 'PCS').toUpperCase()
    results.push({ qtyNum: num, qty: `${num} ${unit}` })
  }
  const standalone = /\b(\d+)\s*(PCS|SETS?|PIECES?)\b/gi
  while ((match = standalone.exec(text)) !== null) {
    const num = parseInt(match[1], 10)
    const unit = match[2].toUpperCase()
    if (!results.some((r) => r.qtyNum === num)) {
      results.push({ qtyNum: num, qty: `${num} ${unit}` })
    }
  }
  return results
}

function extractBrand(lines: string[]): string {
  for (const line of lines) {
    const upper = line.trim().toUpperCase()
    if (/^[A-Z]{2,6}$/.test(upper) &&
      !['QTY', 'PCS', 'SET', 'SETS', 'ITEM', 'MADE', 'THE', 'AND', 'FOR', 'BOX', 'CTN'].includes(upper)) {
      return upper
    }
  }
  return ''
}

function extractOrigin(text: string): string {
  const match = text.match(/MADE\s+IN\s+([A-Z][A-Z ]+)/i)
  return match ? match[1].trim() : ''
}

function isCartonStart(line: string, currentBlock: string[]): boolean {
  if (currentBlock.length === 0) return false
  const upper = line.toUpperCase().trim()

  if (/^[A-Z]{2,6}$/.test(upper) && !['QTY', 'PCS', 'SET', 'SETS', 'ITEM', 'MADE'].includes(upper)) {
    const blockText = currentBlock.join(' ')
    if (/ITEM|QTY/i.test(blockText)) return true
  }

  if (/ITEM\s*N/i.test(line)) {
    const blockText = currentBlock.join(' ')
    if (/ITEM\s*N/i.test(blockText)) return true
  }

  return false
}

function parseCartonBlock(lines: string[]): CartonData {
  let brand = '', itemNo = '', qty = '', qtyNum = 0, origin = ''
  const fullText = lines.join('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (!itemNo) {
      const itemMatch = trimmed.match(/(?:ITEM\s*)?N[O0]?\s*[.:;]?\s*([A-Z][-]?\d{2,}[-A-Z0-9]*)/i)
      if (itemMatch) { itemNo = normalizeItemNo(itemMatch[1]); continue }
      const fuzzyMatch = trimmed.match(/[ILTJ1][ILTJ1]?[ILTJ1]?EM\s*N[O0]?\s*[.:;]?\s*([A-Z][-]?\d{2,}[-A-Z0-9]*)/i)
      if (fuzzyMatch) { itemNo = normalizeItemNo(fuzzyMatch[1]); continue }
      const codeMatch = trimmed.match(/\b([A-Z][-]\d{2,}(?:[-]\d+)?)\b/)
      if (codeMatch) { itemNo = normalizeItemNo(codeMatch[1]); continue }
    }

    if (qtyNum === 0) {
      const qtyMatch = trimmed.match(/[QO][TI][YV]\s*[.:;]?\s*(\d+)\s*(PCS|SETS?|PIECES?|PC)?/i)
      if (qtyMatch) {
        qtyNum = parseInt(qtyMatch[1], 10)
        qty = `${qtyNum} ${(qtyMatch[2] || 'PCS').toUpperCase()}`
        continue
      }
      const standaloneQty = trimmed.match(/^(\d+)\s*(PCS|SETS?|PIECES?|PC)\s*$/i)
      if (standaloneQty) {
        qtyNum = parseInt(standaloneQty[1], 10)
        qty = `${qtyNum} ${standaloneQty[2].toUpperCase()}`
        continue
      }
    }

    if (!origin) {
      const originMatch = trimmed.match(/MADE\s+IN\s+([A-Z ]+)/i)
      if (originMatch) { origin = originMatch[1].trim(); continue }
    }

    if (!brand) {
      const upper = trimmed.toUpperCase()
      if (/^[A-Z]{2,6}$/.test(upper) &&
        !['QTY', 'PCS', 'SET', 'SETS', 'ITEM', 'MADE', 'THE', 'AND', 'FOR', 'BOX', 'CTN'].includes(upper)) {
        brand = upper; continue
      }
    }
  }

  if (!itemNo) {
    const m = fullText.match(/(?:ITEM\s*)?N[O0]?\s*[.:;]?\s*([A-Z][-]?\d{2,}[-A-Z0-9]*)/i)
    if (m) itemNo = normalizeItemNo(m[1])
  }
  if (!itemNo) {
    const m = fullText.match(/\b([A-Z][-]\d{2,}(?:[-]\d+)?)\b/)
    if (m) itemNo = normalizeItemNo(m[1])
  }
  if (qtyNum === 0) {
    const m = fullText.match(/[QO][TI][YV]\s*[.:;]?\s*(\d+)\s*(PCS|SETS?|PIECES?|PC)?/i)
    if (m) {
      qtyNum = parseInt(m[1], 10)
      qty = `${qtyNum} ${(m[2] || 'PCS').toUpperCase()}`
    }
  }

  return { brand, itemNo, qty, qtyNum, origin, rawText: fullText }
}

function normalizeItemNo(raw: string): string {
  return raw.toUpperCase().replace(/^[.:;\s]+/, '').replace(/[.:;\s]+$/, '').replace(/\s+/g, '-')
}
