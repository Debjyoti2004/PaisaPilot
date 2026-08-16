'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, CheckCircle, XCircle, X, AlertCircle, ArrowRight, ChevronLeft, Diff, ChevronDown } from 'lucide-react'
import { DownloadMenu } from '@/components/DownloadMenu'

interface CsvRow {
  date: string; narration: string; amount: number; rawLine: string
}
interface TxnRef {
  id: string; narration: string; amount: number; occurredAt: string; account: string
}
interface MatchResult {
  csvRow: CsvRow
  matched: boolean
  txn?: TxnRef
  nearMatch?: TxnRef
}

interface FileMeta {
  bankName: string
  fileType: string
  statementId: string | null
  period: string | null
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function parseCsv(text: string): { rows: CsvRow[]; headers: string[]; error?: string } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { rows: [], headers: [], error: 'File appears empty' }

  const headers = lines[0]!.split(',').map(h => h.replace(/"/g, '').trim())
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!
    const cols = line.split(',').map(c => c.replace(/"/g, '').trim())
    if (cols.length < 2) continue

    let dateVal = '', amtVal = 0, narrationVal = ''

    for (let ci = 0; ci < cols.length; ci++) {
      const h = (headers[ci] ?? '').toLowerCase()
      const v = cols[ci] ?? ''
      if (!dateVal && (h.includes('date') || h.includes('txn') || h.includes('time'))) {
        const cleaned = v.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')
                         .replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1')
        if (!isNaN(Date.parse(cleaned))) dateVal = cleaned
      }
      if (amtVal === 0 && (h.includes('debit') || h.includes('withdrawal') || h.includes('dr') || h === 'amount')) {
        const n = parseFloat(v.replace(/[₹,\s]/g, ''))
        if (!isNaN(n) && n > 0) amtVal = n
      }
      if (!narrationVal && (h.includes('narration') || h.includes('description') || h.includes('particulars') || h.includes('remarks'))) {
        narrationVal = v
      }
    }
    if (amtVal === 0) {
      for (let ci = 0; ci < cols.length; ci++) {
        const h = (headers[ci] ?? '').toLowerCase()
        const v = cols[ci] ?? ''
        if (h.includes('credit') || h.includes('cr')) {
          const n = parseFloat(v.replace(/[₹,\s]/g, ''))
          if (!isNaN(n) && n > 0) amtVal = n
        }
      }
    }
    if (!dateVal) dateVal = cols[0] ?? ''
    if (!narrationVal) narrationVal = cols[1] ?? cols[0] ?? ''
    if (amtVal === 0) {
      for (const v of cols) {
        const n = parseFloat(v.replace(/[₹,\s]/g, ''))
        if (!isNaN(n) && n > 100) { amtVal = n; break }
      }
    }
    if (dateVal && amtVal > 0) rows.push({ date: dateVal, narration: narrationVal, amount: amtVal, rawLine: line })
  }

  return { rows, headers }
}

function extractMeta(name: string, type: 'csv' | 'pdf' | '', rows: CsvRow[]): FileMeta {
  const lower = name.toLowerCase()
  const BANKS = ['hdfc', 'sbi', 'icici', 'axis', 'navi', 'kotak', 'indusind', 'paytm', 'au', 'yes', 'federal', 'idfc', 'pnb', 'bob', 'ubi', 'rbl']
  const bank = BANKS.find(b => lower.includes(b))
  const bankName = bank ? bank.charAt(0).toUpperCase() + bank.slice(1) : 'Bank'

  // Extract last long numeric sequence as statement ID
  const nums = name.match(/\d{6,}/g) ?? []
  const statementId = nums.at(-1) ?? null

  // Period from actual row dates
  let period: string | null = null
  if (rows.length > 0) {
    const dates = rows.map(r => r.date).sort()
    if (dates[0] && dates.at(-1)) {
      period = `${dates[0]} → ${dates.at(-1)}`
    }
  }

  return { bankName, fileType: type ? type.toUpperCase() : 'FILE', statementId, period }
}

function diffText(a: string, b: string) {
  return a.toLowerCase().trim() !== b.toLowerCase().trim()
}

export default function BankComparePage() {
  const [csvRows, setCsvRows]     = useState<CsvRow[]>([])
  const [headers, setHeaders]     = useState<string[]>([])
  const [parseErr, setParseErr]   = useState('')
  const [fileName, setFileName]   = useState('')
  const [fileType, setFileType]   = useState<'csv'|'pdf'|''>('')
  const [parsing, setParsing]     = useState(false)
  const [comparing, setComparing] = useState(false)
  const [results, setResults]     = useState<MatchResult[] | null>(null)
  const [fileMeta, setFileMeta]   = useState<FileMeta | null>(null)
  const [finAccounts, setFinAccounts] = useState<{ id: string; name: string }[]>([])
  const [accountId, setAccountId]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/fin-accounts').then(r => r.json()).then(d => {
      const accs = d.accounts ?? []
      setFinAccounts(accs)
      if (accs.length > 0) setAccountId(accs[0].id)
    }).catch(() => {})
  }, [])

  async function handleFile(file: File) {
    const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
    const isCSV = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv'
    if (!isPDF && !isCSV) { setParseErr('Please upload a CSV or PDF file'); return }
    setFileName(file.name); setFileType(isPDF ? 'pdf' : 'csv')
    setParseErr(''); setResults(null); setCsvRows([])
    setParsing(true)
    try {
      if (isCSV) {
        const text = await file.text()
        const parsed = parseCsv(text)
        if (parsed.error) { setParseErr(parsed.error); return }
        if (parsed.rows.length === 0) { setParseErr('No valid rows found. Check date/amount columns.'); return }
        setCsvRows(parsed.rows); setHeaders(parsed.headers)
        setFileMeta(extractMeta(file.name, 'csv', parsed.rows))
      } else {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/documents/parse', { method: 'POST', body: form })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error || 'Parse failed')
        if (!d.rows || d.rows.length === 0) { setParseErr('No transactions found in PDF. Try CSV export instead.'); return }
        const rows: CsvRow[] = d.rows.map((r: { date: string; merchant: string; amount: number }) => ({
          date: r.date, narration: r.merchant, amount: r.amount, rawLine: '',
        }))
        setCsvRows(rows); setHeaders(['Date', 'Narration', 'Amount'])
        setFileMeta(extractMeta(file.name, 'pdf', rows))
      }
    } catch (e: unknown) {
      setParseErr(e instanceof Error ? e.message : 'Failed to read file')
    } finally { setParsing(false) }
  }

  async function compare() {
    if (csvRows.length === 0) return
    setComparing(true)
    try {
      const res = await fetch('/api/bank-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: csvRows, accountId: accountId || undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Comparison failed')
      setResults(d.results)
    } catch (e: unknown) {
      setParseErr(e instanceof Error ? e.message : 'Comparison failed')
    } finally { setComparing(false) }
  }

  function startOver() {
    setResults(null); setCsvRows([]); setFileName(''); setFileType(''); setParseErr(''); setFileMeta(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const unmatchedRows = (results ?? [])
    .filter(r => !r.matched)
    .map(r => ({ Date: r.csvRow.date, Merchant: r.csvRow.narration, Amount: r.csvRow.amount }))

  const matched   = results?.filter(r => r.matched)  ?? []
  const unmatched = results?.filter(r => !r.matched) ?? []
  const step      = results ? 2 : 1

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div style={{
            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: step >= 1 ? 'var(--violet)' : 'var(--border)', fontSize: 11, fontWeight: 700, color: '#fff',
          }}>1</div>
          <span style={{ fontSize: 13, fontWeight: step === 1 ? 700 : 500, color: step === 1 ? 'var(--text-1)' : 'var(--text-3)' }}>Upload</span>
        </div>
        <ArrowRight size={14} style={{ color: 'var(--text-3)' }} />
        <div className="flex items-center gap-2">
          <div style={{
            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: step === 2 ? 'var(--violet)' : 'rgba(101,88,211,0.15)', fontSize: 11, fontWeight: 700,
            color: step === 2 ? '#fff' : 'var(--violet)',
          }}>2</div>
          <span style={{ fontSize: 13, fontWeight: step === 2 ? 700 : 500, color: step === 2 ? 'var(--text-1)' : 'var(--text-3)' }}>Compare</span>
        </div>
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div style={{ animation: 'slideInRight 0.25s ease' }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Bank statement comparison</h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>
              Upload your bank statement (PDF or CSV) — see what matches your records and what&apos;s missing.
            </p>
          </div>

          {/* Account selector */}
          <div className="flex items-center gap-3" style={{ marginTop: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', flexShrink: 0 }}>Compare against account</label>
            <div className="relative" style={{ maxWidth: 280 }}>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} className="form-select"
                style={{ color: 'var(--text-1)' }}>
                {finAccounts.length === 0
                  ? <option value="">Loading accounts…</option>
                  : <>
                      <option value="">All accounts</option>
                      {finAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </>
                }
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Upload area */}
          <div
            className="card"
            style={{
              marginTop: 16, padding: '40px 24px', textAlign: 'center',
              cursor: csvRows.length > 0 || parsing ? 'default' : 'pointer',
              border: `2px dashed ${csvRows.length > 0 ? 'var(--violet)' : 'var(--border)'}`,
              background: csvRows.length > 0 ? 'var(--violet-bg)' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s',
            }}
            onClick={() => { if (csvRows.length === 0 && !parsing) fileRef.current?.click() }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          >
            <input ref={fileRef} type="file" accept=".csv,.pdf,text/csv,application/pdf" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {parsing ? (
              <>
                <div className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 500 }}>Reading {fileType === 'pdf' ? 'PDF' : 'CSV'}…</p>
              </>
            ) : csvRows.length > 0 ? (
              <>
                <FileText size={32} style={{ color: 'var(--violet)', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 700, color: 'var(--violet)', fontSize: 15 }}>{fileName}</p>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{csvRows.length} transactions parsed</p>
                <button
                  className="btn-ghost"
                  style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}
                  onClick={e => { e.stopPropagation(); startOver() }}
                >
                  <X size={12} /> Remove
                </button>
              </>
            ) : (
              <>
                <Upload size={32} style={{ color: 'var(--text-3)', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 15 }}>Drop your bank statement here</p>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>
                  or click to browse &nbsp;·&nbsp;
                  <span style={{ fontWeight: 600, color: 'var(--violet)' }}>PDF</span> or <span style={{ fontWeight: 600, color: 'var(--violet)' }}>CSV</span>
                  &nbsp;·&nbsp; HDFC, SBI, ICICI, Axis, Navi, Kotak
                </p>
              </>
            )}
          </div>

          {parseErr && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ marginTop: 12, background: 'var(--red-bg)', border: '1px solid #fecaca' }}>
              <AlertCircle size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: 'var(--red)' }}>{parseErr}</p>
              <button className="ml-auto btn-ghost" style={{ padding: 4 }} onClick={() => setParseErr('')}><X size={13} /></button>
            </div>
          )}

          {/* Preview + compare button */}
          {csvRows.length > 0 && (
            <div className="card overflow-hidden" style={{ marginTop: 16 }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Preview — {csvRows.length} rows</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Columns: {headers.join(', ')}</p>
                </div>
                <button className="btn-primary flex items-center gap-2" disabled={comparing} onClick={compare}>
                  {comparing ? (
                    <>
                      <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                      Comparing…
                    </>
                  ) : (
                    <>Compare with my transactions <ArrowRight size={14} /></>
                  )}
                </button>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {csvRows.slice(0, 20).map((r, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 90, fontFamily: 'monospace' }}>{r.date}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.narration}</p>
                    <p className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', flexShrink: 0 }}>{fmtINR(r.amount)}</p>
                  </div>
                ))}
                {csvRows.length > 20 && (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '10px 20px' }}>
                    +{csvRows.length - 20} more rows
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Results ── */}
      {step === 2 && results && (
        <div style={{ animation: 'slideInRight 0.28s ease', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* File metadata bar */}
          {fileMeta && (
            <div className="card flex items-center gap-4 px-5 py-3" style={{ flexWrap: 'wrap', rowGap: 8 }}>
              <FileText size={16} style={{ color: 'var(--violet)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</p>
                {fileMeta.period && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{fileMeta.period}</p>}
              </div>
              <div className="flex items-center gap-2" style={{ flexShrink: 0, flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--violet-bg)', color: 'var(--violet)' }}>
                  {fileMeta.bankName}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--border)', color: 'var(--text-2)' }}>
                  {fileMeta.fileType}
                </span>
                {fileMeta.statementId && (
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)', padding: '2px 8px', borderRadius: 6, background: 'var(--border)' }}>
                    #{fileMeta.statementId}
                  </span>
                )}
              </div>
              <button className="btn-ghost flex items-center gap-1" style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }} onClick={startOver}>
                <ChevronLeft size={13} /> Start over
              </button>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5">
              <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Matched</p>
              <p className="num" style={{ fontSize: 32, fontWeight: 800, color: 'var(--green)', margin: '8px 0 4px' }}>{matched.length}</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Found in your transactions</p>
            </div>
            <div className="card p-5">
              <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Unmatched</p>
              <p className="num" style={{ fontSize: 32, fontWeight: 800, color: 'var(--red)', margin: '8px 0 4px' }}>{unmatched.length}</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Not in your records</p>
            </div>
            <div className="card p-5">
              <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Match rate</p>
              <p className="num" style={{ fontSize: 32, fontWeight: 800, color: 'var(--violet)', margin: '8px 0 4px' }}>
                {results.length > 0 ? Math.round((matched.length / results.length) * 100) : 0}%
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>of {results.length} bank entries</p>
            </div>
          </div>

          {/* Action bar */}
          {unmatched.length > 0 && (
            <div className="flex items-center gap-3" style={{ paddingTop: 4 }}>
              <DownloadMenu
                filename={`unmatched-${fileName.replace(/\.(csv|pdf)$/i, '')}`}
                rows={unmatchedRows}
                columns={[
                  { key: 'Date', header: 'Date' },
                  { key: 'Merchant', header: 'Merchant' },
                  { key: 'Amount', header: 'Amount (₹)' },
                ]}
                label="Download unmatched"
              />
            </div>
          )}

          {/* Side-by-side diff */}
          <div className="grid grid-cols-2 gap-4">

            {/* Matched column */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(16,185,129,0.06)' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle size={15} style={{ color: 'var(--green)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Matched — {matched.length}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Found in PaisaPilot records</p>
              </div>
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                {matched.map((r, i) => {
                  const amtDiff = r.txn ? Math.abs(r.txn.amount - r.csvRow.amount) : 0
                  const narrationDiffers = r.txn ? diffText(r.csvRow.narration, r.txn.narration) : false
                  return (
                    <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '12px 20px' }}>
                      {/* Bank entry */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', marginTop: 2, minWidth: 34 }}>BANK</span>
                        <div style={{ flex: 1 }}>
                          <div className="flex items-center justify-between gap-2">
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.csvRow.narration}</p>
                            <p className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', flexShrink: 0 }}>{fmtINR(r.csvRow.amount)}</p>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'monospace' }}>{r.csvRow.date}</p>
                        </div>
                      </div>
                      {/* PaisaPilot entry */}
                      {r.txn && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--violet)', marginTop: 2, minWidth: 34 }}>APP</span>
                          <div style={{ flex: 1 }}>
                            <div className="flex items-center justify-between gap-2">
                              <p style={{
                                fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                color: narrationDiffers ? '#d97706' : 'var(--text-1)',
                              }}>{r.txn.narration || '—'}</p>
                              <p className="num" style={{ fontSize: 13, fontWeight: 700, color: amtDiff > 1 ? '#d97706' : 'var(--green)', flexShrink: 0 }}>
                                {fmtINR(r.txn.amount)}{amtDiff > 1 ? ` (Δ${fmtINR(amtDiff)})` : ''}
                              </p>
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'monospace' }}>{r.txn.occurredAt.slice(0, 10)}</p>
                            {r.txn.account && <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{r.txn.account}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {matched.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '24px 20px', textAlign: 'center' }}>No matches found</p>}
              </div>
            </div>

            {/* Unmatched column */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(239,68,68,0.05)' }}>
                <div className="flex items-center gap-2">
                  <XCircle size={15} style={{ color: 'var(--red)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Unmatched — {unmatched.length}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Not recorded in PaisaPilot</p>
              </div>
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                {unmatched.map((r, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '12px 20px' }}>
                    {/* Bank entry */}
                    <div className="flex items-center justify-between gap-2">
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.csvRow.narration}</p>
                      <p className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', flexShrink: 0 }}>{fmtINR(r.csvRow.amount)}</p>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'monospace' }}>{r.csvRow.date}</p>

                    {/* Near match hint */}
                    {r.nearMatch && (
                      <div style={{
                        marginTop: 8, padding: '6px 10px', borderRadius: 8,
                        background: 'rgba(245,158,11,0.07)', border: '1px dashed rgba(245,158,11,0.3)',
                      }}>
                        <div className="flex items-center gap-1" style={{ marginBottom: 2 }}>
                          <Diff size={11} style={{ color: '#d97706' }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>Closest PaisaPilot entry</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.nearMatch.narration || '—'}</p>
                          <p className="num" style={{ fontSize: 12, color: 'var(--text-2)', flexShrink: 0 }}>{fmtINR(r.nearMatch.amount)}</p>
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>{r.nearMatch.occurredAt.slice(0, 10)}</p>
                      </div>
                    )}
                  </div>
                ))}
                {unmatched.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '24px 20px', textAlign: 'center' }}>All entries matched!</p>}
              </div>
            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
