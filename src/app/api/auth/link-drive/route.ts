import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/auth/link-drive — returns Google OAuth URL for Drive access
export async function GET(request: NextRequest) {
  try {
    await requireUserId()
    const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? new URL(request.url).origin

    const params = new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      redirect_uri:  `${origin}/api/auth/link-drive/callback`,
      response_type: 'code',
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
      ].join(' '),
      access_type:   'offline',
      prompt:        'consent',
    })

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  } catch {
    return NextResponse.redirect('/settings?drive_error=unauthorized')
  }
}

// POST /api/auth/link-drive/callback handled separately
// But we handle callback via GET as Google redirects with ?code=
export async function POST(request: NextRequest) {
  return GET(request)
}
