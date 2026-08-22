'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileText, FileSpreadsheet, File, ChevronDown, Cloud, CheckCircle, AlertCircle } from 'lucide-react'

export interface DownloadColumn {
  key: string
  header: string
}

export interface DownloadMenuProps {
  /** Base filename without extension */
  filename: string
  /** Rows of data — each row is a record matching column keys */
  rows: Record<string, string | number | null | undefined>[]
  /** Column definitions — controls order, header labels, and which keys to include */
  columns: DownloadColumn[]
  /** Button label (default: "Download") */
  label?: string
  /** Extra CSS class for the trigger button */
  className?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/logo.png')
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ── Format generators ──────────────────────────────────────────────────────────

function buildCsvText(
  rows: Record<string, string | number | null | undefined>[],
  columns: DownloadColumn[],
): string {
  const header = columns.map(c => `"${c.header}"`).join(',')
  const body = rows.map(row =>
    columns.map(c => {
      const v = row[c.key]
      if (v == null) return '""'
      return `"${String(v).replace(/"/g, '""')}"`
    }).join(',')
  )
  return [header, ...body].join('\n')
}

function triggerBlobDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.setAttribute('download', name)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 200)
}

async function downloadAsCSV(
  rows: Record<string, string | number | null | undefined>[],
  columns: DownloadColumn[],
  filename: string,
) {
  const csv = buildCsvText(rows, columns)
  triggerBlobDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`)
}

async function downloadAsXLSX(
  rows: Record<string, string | number | null | undefined>[],
  columns: DownloadColumn[],
  filename: string,
) {
  // xlsx is a CJS module — .default may be undefined in some bundlers
  const xlsxMod = await import('xlsx')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const XLSX = (xlsxMod as any).default ?? xlsxMod
  const wsData = [
    columns.map(c => c.header),
    ...rows.map(row => columns.map(c => row[c.key] ?? '')),
  ]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = columns.map((c: DownloadColumn) => ({
    wch: Math.max(c.header.length, ...rows.map(r => String(r[c.key] ?? '').length)) + 2,
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  // writeFile triggers browser download directly
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

async function downloadAsPDF(
  rows: Record<string, string | number | null | undefined>[],
  columns: DownloadColumn[],
  filename: string,
) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: columns.length > 4 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  const colW = (pageW - margin * 2) / columns.length

  // Header bar with logo
  doc.setFillColor(79, 70, 229)
  doc.rect(0, 0, pageW, 24, 'F')
  const logo = await getLogoDataUrl()
  if (logo) {
    doc.addImage(logo, 'PNG', margin, 2, 20, 20)
  }
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('PaisaPilot', margin + 23, 11)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 195, 255)
  doc.text(filename.replace(/-/g, ' '), margin + 23, 18)
  doc.setTextColor(180, 175, 240)
  doc.text(new Date().toLocaleDateString('en-IN'), pageW - margin, 18, { align: 'right' })

  const headerY = 34
  doc.setFillColor(101, 88, 211)
  doc.rect(margin, headerY - 5, pageW - margin * 2, 8, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  columns.forEach((c, i) => doc.text(c.header, margin + i * colW + 2, headerY))

  doc.setTextColor(50, 50, 50)
  doc.setFont('helvetica', 'normal')
  let y = headerY + 10
  rows.forEach((row, ri) => {
    if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20 }
    if (ri % 2 === 0) {
      doc.setFillColor(248, 247, 255)
      doc.rect(margin, y - 4, pageW - margin * 2, 7, 'F')
    }
    doc.setFontSize(8)
    columns.forEach((c, i) => {
      const val = row[c.key]
      doc.text(String(val ?? '—').slice(0, 28), margin + i * colW + 2, y)
    })
    y += 7
  })

  // Page footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 180)
    doc.text(`PaisaPilot | ${filename.replace(/-/g, ' ')} | Page ${i} of ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' })
  }

  doc.save(`${filename}.pdf`)
}

async function uploadToDrive(
  rows: Record<string, string | number | null | undefined>[],
  columns: DownloadColumn[],
  filename: string,
  fmt: 'csv' | 'xlsx' | 'pdf',
): Promise<{ success: boolean; link?: string; error?: string }> {
  let content = ''
  let mimeType = 'text/csv'

  if (fmt === 'csv') {
    content = buildCsvText(rows, columns)
    mimeType = 'text/csv'
  } else if (fmt === 'xlsx') {
    // For xlsx, generate base64 and upload as binary
    const xlsxMod = await import('xlsx')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX = (xlsxMod as any).default ?? xlsxMod
    const wsData = [columns.map(c => c.header), ...rows.map(row => columns.map(c => row[c.key] ?? ''))]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buf = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
    content = buf
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    const res = await fetch('/api/drive-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: `${filename}.xlsx`, content, mimeType }),
    })
    const d = await res.json()
    return res.ok ? { success: true, link: d.link } : { success: false, error: d.error }
  } else {
    // PDF: generate blob → base64
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: columns.length > 4 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth(); const margin = 14; const colW = (pageW - margin * 2) / columns.length
    doc.setFillColor(79, 70, 229); doc.rect(0, 0, pageW, 24, 'F')
    const logo = await getLogoDataUrl()
    if (logo) doc.addImage(logo, 'PNG', margin, 2, 20, 20)
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
    doc.text('PaisaPilot', margin + 23, 11)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 195, 255)
    doc.text(filename.replace(/-/g, ' '), margin + 23, 18)
    doc.setFillColor(101,88,211); doc.rect(margin, 29, pageW-margin*2, 8, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255,255,255)
    columns.forEach((c,i) => doc.text(c.header, margin+i*colW+2, 35))
    doc.setTextColor(50,50,50); doc.setFont('helvetica', 'normal'); let y = 45
    rows.forEach((row,ri) => {
      if (y > doc.internal.pageSize.getHeight()-20) { doc.addPage(); y = 20 }
      if (ri%2===0) { doc.setFillColor(248,247,255); doc.rect(margin, y-4, pageW-margin*2, 7, 'F') }
      doc.setFontSize(8); columns.forEach((c,i) => doc.text(String(row[c.key]??'—').slice(0,28), margin+i*colW+2, y)); y += 7
    })
    content = doc.output('datauristring').split(',')[1] ?? ''
    mimeType = 'application/pdf'
  }

  const res = await fetch('/api/drive-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: `${filename}.${fmt}`, content, mimeType }),
  })
  const d = await res.json()
  return res.ok ? { success: true, link: d.link } : { success: false, error: d.error }
}

// ── Component ─────────────────────────────────────────────────────────────────

const FORMATS = [
  { id: 'csv',  label: 'CSV',   desc: 'Spreadsheet-compatible',  icon: FileText },
  { id: 'xlsx', label: 'Excel', desc: 'Microsoft Excel (.xlsx)',  icon: FileSpreadsheet },
  { id: 'pdf',  label: 'PDF',   desc: 'Formatted PDF report',    icon: File },
] as const

export function DownloadMenu({ filename, rows, columns, label = 'Download', className = '' }: DownloadMenuProps) {
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState<string | null>(null)
  const [driveConnected, setDrive]  = useState<boolean | null>(null)
  const [driveMsg, setDriveMsg]     = useState<{ ok: boolean; text: string } | null>(null)
  const [dropPos, setDropPos]       = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const ref       = useRef<HTMLDivElement>(null)
  const btnRef    = useRef<HTMLButtonElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  // Check Drive connection once on mount
  useEffect(() => {
    fetch('/api/drive-upload').then(r => r.json()).then(d => setDrive(d.connected)).catch(() => setDrive(false))
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      const inTrigger = ref.current?.contains(e.target as Node)
      const inPortal  = portalRef.current?.contains(e.target as Node)
      if (!inTrigger && !inPortal) setOpen(false)
    }
    function onScroll() { setOpen(false) }
    document.addEventListener('click', handler, true)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('click', handler, true)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  async function handleDownload(fmt: 'csv' | 'xlsx' | 'pdf') {
    setLoading(`dl-${fmt}`); setOpen(false)
    try {
      if (fmt === 'csv')  await downloadAsCSV(rows, columns, filename)
      if (fmt === 'xlsx') await downloadAsXLSX(rows, columns, filename)
      if (fmt === 'pdf')  await downloadAsPDF(rows, columns, filename)
    } finally { setLoading(null) }
  }

  async function handleDrive(fmt: 'csv' | 'xlsx' | 'pdf') {
    setLoading(`drive-${fmt}`); setOpen(false); setDriveMsg(null)
    try {
      const result = await uploadToDrive(rows, columns, filename, fmt)
      setDriveMsg(result.success
        ? { ok: true, text: `Saved to Drive as ${fmt.toUpperCase()}` }
        : { ok: false, text: result.error ?? 'Upload failed' }
      )
      setTimeout(() => setDriveMsg(null), 4000)
    } finally { setLoading(null) }
  }

  const busy = loading !== null

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}>
      <div ref={ref} style={{ position: 'relative', display: 'inline-flex', gap: 6 }}>
        {/* Main download button */}
        <button
          ref={btnRef}
          className={`btn-primary flex items-center gap-2 ${className}`}
          onClick={() => {
            if (btnRef.current) {
              const r = btnRef.current.getBoundingClientRect()
              setDropPos({ top: r.bottom + 6, left: r.left })
            }
            setOpen(o => !o)
          }}
          disabled={busy}
        >
          {busy && loading?.startsWith('dl') ? (
            <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
          ) : (
            <Download size={14} />
          )}
          {busy && loading?.startsWith('dl') ? `Generating…` : label}
          <ChevronDown size={12} style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        {/* Drive button */}
        {driveConnected && (
          <button
            className="btn-secondary flex items-center gap-2"
            disabled={busy}
            title="Save to Google Drive"
            onClick={() => { setOpen(false); handleDrive('csv') }}
            style={{ padding: '8px 12px' }}
          >
            {busy && loading?.startsWith('drive') ? (
              <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <Cloud size={14} />
            )}
          </button>
        )}

        {/* Format dropdown — rendered in a portal so card overflow doesn't clip it */}
        {open && typeof document !== 'undefined' && createPortal(
          <div ref={portalRef} style={{
            position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(210,214,230,0.7)',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(101,88,211,0.14), 0 2px 8px rgba(0,0,0,0.07)',
            padding: 6,
            minWidth: 220,
          }}>
            {/* Download section */}
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', padding: '4px 10px 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Download
            </p>
            {FORMATS.map(f => (
              <button key={f.id} onClick={() => handleDownload(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '7px 10px', borderRadius: 8, border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(101,88,211,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <f.icon size={15} style={{ color: 'var(--violet)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2 }}>{f.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.2 }}>{f.desc}</p>
                </div>
              </button>
            ))}

            {/* Save to Drive section */}
            {driveConnected && (
              <>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', padding: '4px 10px 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Save to Drive
                </p>
                {FORMATS.map(f => (
                  <button key={`drive-${f.id}`} onClick={() => handleDrive(f.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '7px 10px', borderRadius: 8, border: 'none',
                      background: 'transparent', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(101,88,211,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Cloud size={15} style={{ color: '#4285f4', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2 }}>Drive · {f.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.2 }}>Upload to PaisaPilot folder</p>
                    </div>
                  </button>
                ))}
              </>
            )}

            {driveConnected === false && (
              <>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />
                <a href="/settings#drive" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8, textDecoration: 'none',
                  color: 'var(--text-3)', fontSize: 12,
                }}>
                  <Cloud size={13} style={{ color: '#4285f4' }} />
                  Connect Google Drive in Settings
                </a>
              </>
            )}
          </div>,
          document.body
        )}
      </div>

      {/* Drive status toast */}
      {driveMsg && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{
          background: driveMsg.ok ? 'var(--green-bg)' : 'var(--red-bg)',
          border: `1px solid ${driveMsg.ok ? 'var(--green-border)' : '#fecaca'}`,
          fontSize: 12, fontWeight: 500,
          color: driveMsg.ok ? 'var(--green)' : 'var(--red)',
          animation: 'slideInRight 0.2s ease',
        }}>
          {driveMsg.ok
            ? <CheckCircle size={13} style={{ flexShrink: 0 }} />
            : <AlertCircle size={13} style={{ flexShrink: 0 }} />
          }
          {driveMsg.text}
        </div>
      )}
    </div>
  )
}
