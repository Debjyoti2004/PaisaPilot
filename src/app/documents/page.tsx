'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Upload, FileText, Cloud, Download, AlertCircle, CheckCircle, ChevronDown, X, RotateCcw, Camera } from 'lucide-react'
import {
  WealthGroup, NEEDS_CATS, WANTS_CATS, INV_CATS, ALL_CATS, INCOME_CATS,
  GROUP_DEFAULT_CAT, GROUP_META, catToGroup,
} from '@/config/categories'
import { DatePicker } from '@/components/DatePicker'

interface ParsedRow { date: string; merchant: string; amount: number; type: 'expense' | 'income'; category: string }
interface Rule { id: string; whenText: string; thenText: string; enabled: boolean }

interface EditableRow {
  localId: number
  date: string; merchant: string; amount: number; type: 'expense' | 'income'; category: string
  wealthGroup: WealthGroup | null
  editMerchant: string; editAmount: number; editDate: string
  expanded: boolean
  ruleMatched?: string
}


function applyRules(merchant: string, rules: Rule[]): { category: string; wealthGroup: WealthGroup | null; matched: string | undefined } {
  for (const rule of rules) {
    if (!rule.enabled) continue
    if (merchant.toLowerCase().includes(rule.whenText.toLowerCase())) {
      return { category: rule.thenText, wealthGroup: catToGroup(rule.thenText), matched: rule.thenText }
    }
  }
  return { category: 'Other', wealthGroup: null, matched: undefined }
}

function toEditable(rows: ParsedRow[], rules: Rule[]): EditableRow[] {
  return rows.map((r, i) => {
    const applied = r.type === 'expense' ? applyRules(r.merchant, rules) : { category: 'Salary', wealthGroup: null as WealthGroup | null, matched: undefined }
    return {
      localId: i, date: r.date, merchant: r.merchant, amount: r.amount, type: r.type,
      category: applied.category, wealthGroup: applied.wealthGroup,
      editMerchant: r.merchant, editAmount: r.amount, editDate: r.date,
      expanded: false, ruleMatched: applied.matched,
    }
  })
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export default function DocumentsPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const rulesRef = useRef<Rule[]>([])
  const [rows, setRows]               = useState<EditableRow[] | null>(null)
  const [fileName, setFileName]       = useState('')
  const [fileType, setFileType]       = useState<'csv' | 'pdf' | 'xlsx' | 'image' | ''>('')
  const [importing, setImporting]     = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [parsing, setParsing]         = useState(false)
  const [result, setResult]           = useState<{ imported: number; skipped: number; ids: string[] } | null>(null)
  const [undoing, setUndoing]         = useState(false)
  const [error, setError]             = useState('')
  const [dragging, setDragging]       = useState(false)
  const [account, setAccount]         = useState('')
  const [finAccounts, setFinAccounts] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch('/api/rules').then(r => r.json()).then(d => { rulesRef.current = d.rules ?? [] }).catch(() => {})
    fetch('/api/fin-accounts').then(r => r.json()).then(d => {
      const accs = d.accounts ?? []
      setFinAccounts(accs)
      if (accs.length > 0) setAccount(accs[0].id)
    }).catch(() => {})
  }, [])

  const updateRow = useCallback((idx: number, patch: Partial<EditableRow>) => {
    setRows(prev => prev ? prev.map((r, i) => i === idx ? { ...r, ...patch } : r) : prev)
  }, [])

  async function handleFile(file: File) {
    const name = file.name.toLowerCase()
    const isPDF  = name.endsWith('.pdf') || file.type === 'application/pdf'
    const isCSV  = name.endsWith('.csv') || file.type === 'text/csv'
    const isXLSX = name.endsWith('.xlsx') || name.endsWith('.xls')
    const isImg  = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || file.type.startsWith('image/')
    if (!isPDF && !isCSV && !isXLSX && !isImg) {
      setError('Supported formats: CSV, PDF, XLSX, JPG, PNG')
      return
    }
    const detectedType: 'csv' | 'pdf' | 'xlsx' | 'image' = isPDF ? 'pdf' : isCSV ? 'csv' : isXLSX ? 'xlsx' : 'image'
    setFileName(file.name); setFileType(detectedType)
    setError(''); setResult(null); setRows(null)
    setParsing(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/documents/parse', { method: 'POST', body: form })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Parse failed')
      if (!d.rows || d.rows.length === 0) {
        setError('No transactions found. Check the file format or try a different export from your bank.')
        setFileName(''); setFileType('')
      } else {
        setRows(toEditable(d.rows as ParsedRow[], rulesRef.current))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to read file')
      setFileName(''); setFileType('')
    } finally { setParsing(false) }
  }

  async function doImport() {
    if (!rows) return
    setImporting(true); setError('')
    setImportProgress({ done: 0, total: rows.length })
    let imported = 0; let skipped = 0
    const importedIds: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      const isIncomeGroup = row.wealthGroup === 'income'
      const effectiveType = isIncomeGroup ? 'income' : row.type
      const effectiveGroup = isIncomeGroup ? null : row.wealthGroup

      try {
        const res = await fetch('/api/transactions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchant: row.editMerchant || row.merchant,
            date: row.editDate || row.date,
            amount: row.editAmount || row.amount,
            type: effectiveType,
            category: row.category,
            accountId: account || undefined, source: 'import',
            wealthGroup: effectiveGroup,
          }),
        })
        const d = await res.json()
        if (res.status === 409 && d.duplicate) { skipped++ }
        else if (!res.ok) { skipped++ }
        else {
          if (d.transaction?.id) importedIds.push(d.transaction.id)
          imported++
        }
      } catch { skipped++ }
      setImportProgress({ done: i + 1, total: rows.length })
    }
    setResult({ imported, skipped, ids: importedIds })
    setRows(null); setFileName(''); setFileType('')
    setImporting(false); setImportProgress(null)
    window.dispatchEvent(new Event('paisapilot:refresh'))
  }

  async function undoImport() {
    if (!result || result.ids.length === 0) return
    setUndoing(true)
    try {
      await fetch(`/api/transactions?ids=${result.ids.join(',')}`, { method: 'DELETE' })
      setResult(null)
      window.dispatchEvent(new Event('paisapilot:refresh'))
    } catch { /* ignore */ } finally { setUndoing(false) }
  }

  function clearFile() { setRows(null); setFileName(''); setFileType(''); setError('') }

  const totalIncome      = rows?.filter(r => r.type === 'income' || r.wealthGroup === 'income').reduce((s, r) => s + r.editAmount, 0) ?? 0
  const totalExpense     = rows?.filter(r => r.type === 'expense' && r.wealthGroup !== 'income').reduce((s, r) => s + r.editAmount, 0) ?? 0
  const ruleMatchCount   = rows?.filter(r => r.ruleMatched).length ?? 0
  const ungroupedCount   = rows?.filter(r => r.wealthGroup === null).length ?? 0
  const canImport        = ungroupedCount === 0

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 820, margin: '0 auto', minWidth: 0 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Import transactions</h2>
        <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>Upload your bank statement — PDF or CSV. Duplicates are automatically skipped.</p>
      </div>

      {/* Drive sync banner */}
      <div className="flex items-center gap-4 rounded-2xl px-5 py-4"
        style={{ background: 'var(--violet-bg)', border: '1px solid var(--violet-border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--violet)', opacity: 0.9 }}>
          <Cloud size={16} style={{ color: '#fff' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--violet)' }}>Auto-import with Google Drive</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>Connect Drive and PaisaPilot pulls new statements automatically every day.</p>
        </div>
        <Link href="/settings#drive" className="btn-primary" style={{ fontSize: 12, padding: '7px 14px', flexShrink: 0, whiteSpace: 'nowrap' }}>Set up →</Link>
      </div>

      <div className="card p-6 space-y-5">

        {/* Account selector — always visible */}
        <div className="flex items-center gap-3">
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', flexShrink: 0 }}>Import to account</label>
          <div className="relative" style={{ maxWidth: 260 }}>
            <select value={account} onChange={e => setAccount(e.target.value)} className="form-select"
              style={{ color: account ? 'var(--text-1)' : 'var(--text-3)' }}>
              {finAccounts.length === 0
                ? <option value="">Loading accounts…</option>
                : <>
                    {!account && <option value="" disabled>Choose your account</option>}
                    {finAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </>
              }
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Drop zone */}
        {!rows && !parsing && (
          <div>
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer"
              style={{ border: `2px dashed ${dragging ? 'var(--violet)' : 'var(--border)'}`, padding: '40px 24px', background: dragging ? 'var(--violet-bg)' : 'var(--bg)', transition: 'all 0.2s' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: dragging ? 'var(--violet)' : 'var(--bg-2)' }}>
                <Upload size={24} style={{ color: dragging ? '#fff' : 'var(--text-3)' }} />
              </div>
              <div className="text-center">
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Drop your bank statement here</p>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>or <span style={{ color: 'var(--violet)', fontWeight: 600 }}>click to browse</span></p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {['PDF', 'CSV', 'XLSX', 'JPG', 'PNG'].map(f => (
                  <span key={f} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>{f}</span>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>HDFC · SBI · ICICI · Kotak · Axis · Navi</p>
              <input ref={fileRef} type="file"
                accept=".csv,.pdf,.xlsx,.xls,.jpg,.jpeg,.png,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>

            {/* Camera capture button */}
            <button
              onClick={() => cameraRef.current?.click()}
              style={{
                marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 16px', borderRadius: 14, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: 'rgba(101,88,211,0.06)', border: '1.5px dashed rgba(101,88,211,0.3)', color: 'var(--violet)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(101,88,211,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(101,88,211,0.06)' }}>
              <Camera size={15} />
              Take photo of statement
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        )}

        {/* Parsing spinner */}
        {parsing && (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-10 h-10 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
            <p style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 500 }}>Reading {fileType === 'pdf' ? 'PDF' : fileType === 'xlsx' ? 'Excel' : fileType === 'image' ? 'image' : 'CSV'}…</p>
          </div>
        )}

        {/* Preview with per-row controls */}
        {rows && rows.length > 0 && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                background: fileType === 'pdf' ? '#fee2e2' : fileType === 'xlsx' ? '#d1fae5' : fileType === 'image' ? '#ede9fe' : '#dcfce7',
              }}>
                {fileType === 'image' ? <Camera size={15} style={{ color: '#7c3aed' }} /> : <FileText size={15} style={{ color: fileType === 'pdf' ? '#ef4444' : fileType === 'xlsx' ? '#059669' : '#16a34a' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                  {rows.length} transactions · {fmtINR(totalIncome)} in · {fmtINR(totalExpense)} out
                  {ruleMatchCount > 0 && <span style={{ color: 'var(--violet)', marginLeft: 6 }}>· {ruleMatchCount} auto-categorized by rules</span>}
                </p>
              </div>
              <button className="btn-ghost" style={{ padding: 6 }} onClick={clearFile}><X size={14} /></button>
            </div>

            {/* Hint */}
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Tap the group buttons on each row to categorize. Click ▾ to edit.</p>

            {/* Per-row list */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ minWidth: 88, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>DATE</div>
                <div style={{ flex: 1, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>MERCHANT</div>
                <div style={{ minWidth: 80, textAlign: 'right', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>AMOUNT</div>
                <div style={{ minWidth: 164, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>GROUP</div>
                <div style={{ width: 28 }}></div>
              </div>

              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {rows.map((row, i) => (
                  <div key={row.localId} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    {/* Main row */}
                    <div className="flex items-center gap-3 px-4 py-2.5" style={{
                      background: row.expanded ? 'var(--violet-bg)' : (row.wealthGroup === null ? '#fffbeb' : undefined),
                      borderLeft: row.wealthGroup === null ? '3px solid #fbbf24' : '3px solid transparent',
                    }}>
                      <div style={{ minWidth: 88, fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>{row.editDate}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.editMerchant}
                        </p>
                        {row.ruleMatched && (
                          <p style={{ fontSize: 10, color: 'var(--violet)', marginTop: 1 }}>⚡ rule: {row.ruleMatched}</p>
                        )}
                      </div>
                      <div style={{ minWidth: 80, textAlign: 'right', fontSize: 13, fontWeight: 600, color: row.type === 'income' ? 'var(--green)' : 'var(--text-1)' }}>
                        {fmtINR(row.editAmount)}
                      </div>
                      {/* Group selector */}
                      <div className="flex gap-1" style={{ minWidth: 164 }}>
                        {(Object.keys(GROUP_META) as WealthGroup[]).map(g => {
                          const m = GROUP_META[g]
                          const active = row.wealthGroup === g
                          return (
                            <button key={g} className="has-tooltip" data-tip={m.label}
                              onClick={() => {
                                const newGroup = active ? null : g
                                const patch: Partial<EditableRow> = { wealthGroup: newGroup }
                                if (!row.ruleMatched) {
                                  patch.category = newGroup ? GROUP_DEFAULT_CAT[newGroup] : 'Other'
                                }
                                updateRow(i, patch)
                              }}
                              style={{
                                width: 36, height: 28, borderRadius: 6, fontSize: 14, border: `1.5px solid ${active ? m.color : 'var(--border)'}`,
                                background: active ? m.bg : 'transparent', cursor: 'pointer', lineHeight: 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                              {m.emoji}
                            </button>
                          )
                        })}
                      </div>
                      {/* Expand toggle */}
                      <button onClick={() => updateRow(i, { expanded: !row.expanded })}
                        style={{ width: 28, height: 28, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ChevronDown size={15} style={{ transform: row.expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                      </button>
                    </div>

                    {/* Expanded edit panel */}
                    {row.expanded && (
                      <div style={{ padding: '12px 16px 14px', background: '#f8f7ff', borderTop: '1px dashed var(--violet-border)' }}>
                        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                          <div>
                            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Merchant name</label>
                            <input className="form-input" style={{ height: 36, fontSize: 13 }}
                              value={row.editMerchant} onChange={e => updateRow(i, { editMerchant: e.target.value })} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Amount (₹)</label>
                            <input type="number" className="form-input" style={{ height: 36, fontSize: 13 }}
                              value={row.editAmount} onChange={e => updateRow(i, { editAmount: parseFloat(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Date</label>
                            <DatePicker compact value={row.editDate} onChange={v => updateRow(i, { editDate: v })} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Category</label>
                            <div className="relative">
                              <select className="form-select" style={{ height: 36, fontSize: 13 }}
                                value={row.category} onChange={e => {
                                  const cat = e.target.value
                                  const wg = catToGroup(cat)
                                  updateRow(i, { category: cat, ...(wg ? { wealthGroup: wg } : {}) })
                                }}>
                                {(row.type === 'income' ? INCOME_CATS : ALL_CATS).map(c => <option key={c}>{c}</option>)}
                              </select>
                              <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2" style={{ marginTop: 10 }}>
                          <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}
                            onClick={() => updateRow(i, { expanded: false, editMerchant: row.merchant, editAmount: row.amount, editDate: row.date, category: row.ruleMatched ?? (row.type === 'income' ? 'Salary' : 'Other') })}>
                            Reset
                          </button>
                          <button className="btn-primary" style={{ fontSize: 12, padding: '5px 14px' }}
                            onClick={() => updateRow(i, { expanded: false })}>
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Validation warning */}
            {ungroupedCount > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: '#fffbeb', border: '1.5px solid #fcd34d' }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                    {ungroupedCount} {ungroupedCount === 1 ? 'transaction is' : 'transactions are'} missing a group
                  </p>
                  <p style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
                    Select 🏠 Needs, 🛍️ Wants, 📈 Investments or 💰 Income for each highlighted row before importing.
                  </p>
                </div>
              </div>
            )}

            {/* Progress bar */}
            {importProgress && (
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--violet)' }}>
                    Importing {importProgress.done} of {importProgress.total}…
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {Math.round((importProgress.done / importProgress.total) * 100)}%
                  </p>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${(importProgress.done / importProgress.total) * 100}%`, transition: 'width 0.2s ease' }} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button className="btn-secondary" onClick={clearFile} disabled={importing}>Cancel</button>
              <button className="btn-primary" onClick={doImport}
                disabled={importing || !canImport}
                style={{ gap: 7, opacity: canImport ? 1 : 0.45, cursor: canImport ? 'pointer' : 'not-allowed', minWidth: 200 }}>
                <Download size={14} />
                {importing
                  ? importProgress
                    ? `Importing ${importProgress.done} / ${importProgress.total}…`
                    : 'Starting…'
                  : `Import ${rows.length} transactions`}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#dc2626', lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="rounded-xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="flex items-start gap-3">
              <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
              <div className="flex-1">
                <p style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{result.imported} transactions imported successfully</p>
                {result.skipped > 0 && <p style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>{result.skipped} duplicates skipped</p>}
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                  Go to <Link href="/transactions" style={{ color: 'var(--violet)', fontWeight: 600 }}>Transactions</Link> to review them.
                </p>
              </div>
              {result.ids.length > 0 && (
                <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px', gap: 5, color: 'var(--red)', borderColor: '#fecaca' }}
                  onClick={undoImport} disabled={undoing}>
                  <RotateCcw size={13} />{undoing ? 'Undoing…' : 'Undo import'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bank export guide */}
      <div className="card p-5">
        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>How to export from your bank</h4>
        <div className="space-y-3">
          {[
            { bank: 'HDFC',  steps: 'NetBanking → Accounts → Account Statement → Download CSV / PDF' },
            { bank: 'SBI',   steps: 'YONO / NetBanking → Account → Account Statement → Excel / PDF' },
            { bank: 'ICICI', steps: 'NetBanking → My Accounts → Account Statement → Download' },
            { bank: 'Kotak', steps: 'Net Banking → Accounts → Transaction History → Download CSV' },
            { bank: 'Axis',  steps: 'NetBanking → Account Summary → Statement → Download' },
            { bank: 'Navi',  steps: 'Navi App → Payments → Transaction History → Share Statement (PDF)' },
          ].map(({ bank, steps }) => (
            <div key={bank} className="flex gap-3 items-start" style={{ fontSize: 13 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--violet-bg)', color: 'var(--violet)', border: '1px solid var(--violet-border)', flexShrink: 0, marginTop: 1 }}>{bank}</span>
              <span style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>{steps}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
