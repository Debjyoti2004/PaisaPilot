import { NextRequest, NextResponse } from 'next/server'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface ParsedRow {
  date: string
  merchant: string
  amount: number
  type: 'expense' | 'income'
  category: string
}

// ── CSV parser ────────────────────────────────────────────────────────
function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const get = (keys: string[]) => {
      for (const k of keys) {
        const idx = header.findIndex(h => h.includes(k))
        if (idx !== -1 && cols[idx]) return cols[idx]
      }
      return ''
    }
    const dateStr  = get(['date', 'txndate', 'txdate', 'valuedate'])
    const merchant = get(['merchant', 'description', 'narration', 'particulars', 'name', 'payee']) || 'Unknown'
    const amtStr   = get(['amount', 'credit', 'debit', 'amt', 'withdrawlamount', 'depositamount'])
    const typeHint = get(['type', 'txtype', 'transtype', 'crdr', 'crdr'])
    if (!dateStr || !amtStr) continue
    const amount = Math.abs(parseFloat(amtStr.replace(/,/g, '')) || 0)
    if (amount === 0) continue
    const isCredit = typeHint.toLowerCase().includes('credit') || typeHint.toLowerCase().includes('cr')
    rows.push({ date: dateStr, merchant, amount, type: isCredit ? 'income' : 'expense', category: 'Other' })
  }
  return rows
}

function naviDateToISO(d: string): string {
  const parts = d.trim().split(/\s+/)
  const monthMap: Record<string, string> = {
    jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
    jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12',
  }
  const day = String(Number(parts[0])).padStart(2, '0')
  const mon = monthMap[(parts[1] ?? '').toLowerCase()] ?? '01'
  const yr  = parts[2] ?? new Date().getFullYear().toString()
  return `${yr}-${mon}-${day}`
}

// ── Navi UPI statement parser (multi-line format) ────────────────────
function parseNaviPDF(text: string): ParsedRow[] {
  const rows: ParsedRow[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const dateRe = /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i
  const timeRe = /^\d{1,2}:\d{2}\s*[AP]M$/i
  const amtRe  = /^₹([\d,]+(?:\.\d+)?)$/

  let i = 0
  while (i < lines.length) {
    if (!dateRe.test(lines[i])) { i++; continue }
    const dateStr = naviDateToISO(lines[i]); i++

    if (i < lines.length && timeRe.test(lines[i])) i++

    let merchant = 'Unknown'
    let isCredit = false
    if (i < lines.length) {
      const ml = lines[i]
      if (ml.startsWith('Paid to '))         { merchant = ml.slice(8).trim();  isCredit = false; i++ }
      else if (ml.startsWith('Received from ')) { merchant = ml.slice(14).trim(); isCredit = true;  i++ }
    }

    let amount = 0
    while (i < lines.length) {
      const amtMatch = lines[i].match(amtRe)
      if (amtMatch) { amount = parseFloat(amtMatch[1].replace(/,/g, '')); i++; break }
      if (dateRe.test(lines[i])) break
      i++
    }

    if (amount > 0) {
      rows.push({ date: dateStr, merchant: merchant.slice(0, 60), amount, type: isCredit ? 'income' : 'expense', category: 'Other' })
    }
  }
  return rows
}

// ── Generic PDF text → transaction rows (HDFC / SBI / ICICI style) ───
function parsePDFText(text: string): ParsedRow[] {
  const rows: ParsedRow[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const datePatterns = [
    /\b(\d{2}[-\/]\d{2}[-\/]\d{4})\b/,
    /\b(\d{2}[-\/]\d{2}[-\/]\d{2})\b/,
    /\b(\d{2}\s+\w{3}\s+\d{4})\b/,
    /\b(\d{4}[-\/]\d{2}[-\/]\d{2})\b/,
  ]
  const amtPattern = /[\d,]+\.\d{2}/g

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let dateMatch: RegExpMatchArray | null = null
    for (const pat of datePatterns) { dateMatch = line.match(pat); if (dateMatch) break }
    if (!dateMatch) continue
    const amounts = line.match(amtPattern)
    if (!amounts || amounts.length === 0) continue
    const amount = parseFloat(amounts[amounts.length > 1 ? amounts.length - 2 : 0].replace(/,/g, ''))
    if (!isFinite(amount) || amount === 0) continue
    const dateEnd = line.indexOf(dateMatch[0]) + dateMatch[0].length
    const firstAmtStart = line.indexOf(amounts[0])
    const merchant = line.slice(dateEnd, firstAmtStart).trim().replace(/\s+/g, ' ') || 'Unknown'
    const lu = line.toUpperCase()
    const isCredit = lu.includes(' CR') || lu.includes('CREDIT') || lu.includes('SALARY') || lu.includes('NEFT IN') || lu.includes('IMPS IN')
    rows.push({ date: dateMatch[0], merchant: merchant.slice(0, 60) || 'Unknown', amount, type: isCredit ? 'income' : 'expense', category: 'Other' })
  }
  return rows
}

// ── Route handler ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    await requireUserId()
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    let rows: ParsedRow[] = []

    const fname = file.name.toLowerCase()
    const isCSV  = fname.endsWith('.csv') || file.type === 'text/csv'
    const isPDF  = fname.endsWith('.pdf') || file.type === 'application/pdf'
    const isXLSX = fname.endsWith('.xlsx') || fname.endsWith('.xls')
    const isImg  = fname.endsWith('.jpg') || fname.endsWith('.jpeg') || fname.endsWith('.png') || file.type.startsWith('image/')

    if (isCSV) {
      const text = buffer.toString('utf-8')
      rows = parseCSV(text)
    } else if (isPDF) {
      const pdfParse = require('pdf-parse') // eslint-disable-line
      const data = await pdfParse(buffer)
      const isNavi = data.text.includes('Paid via Navi') || data.text.includes('DateTransaction detailsAccountAmount')
      rows = isNavi ? parseNaviPDF(data.text) : parsePDFText(data.text)
    } else if (isXLSX) {
      const xlsxMod = require('xlsx') // eslint-disable-line
      const XLSX = xlsxMod.default ?? xlsxMod
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const jsonRows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (jsonRows.length > 1) {
        const header = (jsonRows[0] as string[]).map((h: string) => String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
        const get = (cols: string[], keys: string[]) => {
          for (const k of keys) {
            const idx = header.findIndex((h: string) => h.includes(k))
            if (idx !== -1 && cols[idx] != null) return String(cols[idx]).trim()
          }
          return ''
        }
        for (let i = 1; i < jsonRows.length; i++) {
          const cols = (jsonRows[i] as string[]).map((c: string) => String(c ?? ''))
          const dateStr  = get(cols, ['date', 'txndate', 'txdate', 'valuedate'])
          const merchant = get(cols, ['merchant', 'description', 'narration', 'particulars', 'name', 'payee']) || 'Unknown'
          const amtStr   = get(cols, ['amount', 'credit', 'debit', 'amt', 'withdrawl', 'deposit'])
          const typeHint = get(cols, ['type', 'txtype', 'crdr'])
          if (!dateStr || !amtStr) continue
          const amount = Math.abs(parseFloat(String(amtStr).replace(/,/g, '')) || 0)
          if (amount === 0) continue
          const isCredit = typeHint.toLowerCase().includes('credit') || typeHint.toLowerCase().includes('cr')
          rows.push({ date: dateStr, merchant, amount, type: isCredit ? 'income' : 'expense', category: 'Other' })
        }
      }
    } else if (isImg) {
      // For images, use PDF parse as a best-effort fallback (image-based statements won't parse well without OCR)
      // Return a helpful error — OCR is not available server-side without a paid API
      return NextResponse.json({
        error: 'Image statements require OCR which is not yet supported. Please download a CSV or PDF from your bank app instead.',
      }, { status: 400 })
    } else {
      return NextResponse.json({ error: 'Supported formats: CSV, PDF, XLSX' }, { status: 400 })
    }

    return NextResponse.json({ rows, total: rows.length })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Parse error:', err)
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 })
  }
}
