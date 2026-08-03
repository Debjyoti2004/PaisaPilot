import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function getAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
    select: { refresh_token: true, access_token: true, expires_at: true },
  })
  if (!account?.refresh_token) return null

  const now = Math.floor(Date.now() / 1000)
  if (account.access_token && account.expires_at && account.expires_at > now + 300) {
    return account.access_token
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type:    'refresh_token',
    }),
  })
  const d = await res.json()
  if (!d.access_token) return null

  await prisma.account.updateMany({
    where: { userId, provider: 'google' },
    data: {
      access_token: d.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (d.expires_in ?? 3600),
    },
  })
  return d.access_token
}

// GET /api/drive-folders — list all folders in My Drive
export async function GET() {
  try {
    const userId = await requireUserId()
    const accessToken = await getAccessToken(userId)
    if (!accessToken) {
      return NextResponse.json({ error: 'Drive not connected', folders: [] }, { status: 401 })
    }

    // Fetch all non-trashed folders in My Drive (up to 200)
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?` +
      `q=mimeType%3D%27application%2Fvnd.google-apps.folder%27+and+trashed%3Dfalse` +
      `&fields=files(id,name,parents)&orderBy=name&pageSize=200`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!res.ok) {
      const err = await res.json()
      const msg = err.error?.message ?? 'Failed to list folders'
      console.error('Drive folders API error:', err.error?.status, msg)
      return NextResponse.json({ error: msg, folders: [] }, { status: res.status === 401 ? 401 : 500 })
    }

    const data = await res.json()
    const folders: { id: string; name: string }[] = (data.files ?? []).map(
      (f: { id: string; name: string }) => ({ id: f.id, name: f.name })
    )

    return NextResponse.json({ folders })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized', folders: [] }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to list folders', folders: [] }, { status: 500 })
  }
}
