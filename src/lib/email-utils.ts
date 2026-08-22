export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string
  subject: string
  html: string
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not set')

  const from = process.env.RESEND_FROM ?? 'PaisaPilot <noreply@debjyoti.co.in>'

  const body: Record<string, unknown> = { from, to: [to], subject, html }

  if (attachments?.length) {
    body.attachments = attachments.map(a => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content)
        ? a.content.toString('base64')
        : Buffer.from(a.content as string).toString('base64'),
    }))
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`)
}

export function emailLogoBlock(): string {
  const logoUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/logo.png`
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
  <tr>
    <td style="vertical-align:middle;padding-right:12px;">
      <img src="${logoUrl}" width="52" height="52" alt="PaisaPilot" style="display:block;" />
    </td>
    <td style="vertical-align:middle;">
      <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.1;">PaisaPilot</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.65);margin-top:3px;letter-spacing:0.8px;text-transform:uppercase;">Your money, clearly.</div>
    </td>
  </tr>
</table>`
}
