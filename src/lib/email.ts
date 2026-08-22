import { sendEmail, emailLogoBlock } from '@/lib/email-utils'

export async function sendInviteEmail({
  to,
  ownerName,
  familyName,
  otp,
  acceptUrl,
}: {
  to: string
  ownerName: string
  familyName: string
  otp: string
  acceptUrl: string
}) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:24px 32px 20px">
      ${emailLogoBlock()}
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff">You've been invited</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
        <strong>${ownerName}</strong> has invited you to view their financial data on PaisaPilot in <strong>read-only mode</strong>.
        You will never be able to add, edit or delete any data.
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280">Family group: <strong style="color:#111">${familyName}</strong></p>
      <div style="margin:24px 0 0;padding:16px 20px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af">Step 1 — Click the link</p>
        <a href="${acceptUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#6558D3;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">Accept invite →</a>
        <p style="margin:10px 0 0;font-size:11px;color:#9ca3af;word-break:break-all">${acceptUrl}</p>
      </div>
      <div style="margin:12px 0 0;padding:20px 20px;background:#f0eeff;border-radius:12px;border:1px solid #c4b5fd">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6558D3">Step 2 — Enter this OTP</p>
        <div style="margin:12px 0;display:flex;gap:8px;align-items:center">
          ${otp.split('').map(d => `<span style="display:inline-block;width:36px;height:44px;line-height:44px;text-align:center;background:#fff;border:2px solid #6558D3;border-radius:8px;font-size:22px;font-weight:800;color:#6558D3">${d}</span>`).join('')}
        </div>
        <p style="margin:4px 0 0;font-size:28px;font-weight:900;color:#6558D3;letter-spacing:6px">${otp}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#6558D3;font-weight:600">⏱ Expires in 5 minutes · one-time use only</p>
      </div>
      <div style="margin:24px 0 0;padding:14px 16px;background:#fef3c7;border-radius:10px;border:1px solid #fde68a">
        <p style="margin:0;font-size:12px;color:#92400e">
          🔒 <strong>Security tip:</strong> Never share this OTP with anyone. PaisaPilot will never ask for your OTP over phone or chat.
          If you didn't expect this email, please ignore it.
        </p>
      </div>
    </div>
    <div style="padding:16px 32px 24px;border-top:1px solid #f3f4f6">
      <p style="margin:0;font-size:11px;color:#9ca3af">PaisaPilot · Your money, clearly. This invite was sent to ${to}.</p>
    </div>
  </div>
</body>
</html>`

  await sendEmail({
    to,
    subject: `${ownerName} invited you to view their finances on PaisaPilot — OTP inside`,
    html,
  })
}
