import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings?drive_error=${error ?? 'no_code'}`)
  }

  try {
    const userId = await requireUserId()

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  `${origin}/api/auth/link-drive/callback`,
        grant_type:    'authorization_code',
        code,
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokens.access_token) {
      return NextResponse.redirect(`${origin}/settings?drive_error=token_exchange_failed`)
    }

    // Get the Google account ID from the id_token
    let providerAccountId = ''
    if (tokens.id_token) {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString())
      providerAccountId = payload.sub ?? ''
    }

    // Upsert the Account record so both Google sign-in users AND credentials users get Drive tokens
    const existing = await prisma.account.findFirst({
      where: { userId, provider: 'google' },
    })

    if (existing) {
      await prisma.account.update({
        where: { id: existing.id },
        data: {
          access_token:  tokens.access_token,
          refresh_token: tokens.refresh_token ?? existing.refresh_token,
          expires_at:    tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
          scope:         tokens.scope,
        },
      })
    } else {
      await prisma.account.create({
        data: {
          userId,
          type:              'oauth',
          provider:          'google',
          providerAccountId: providerAccountId || `drive-${userId}`,
          access_token:      tokens.access_token,
          refresh_token:     tokens.refresh_token ?? null,
          expires_at:        tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
          token_type:        tokens.token_type ?? 'Bearer',
          scope:             tokens.scope ?? '',
        },
      })
    }

    return NextResponse.redirect(`${origin}/settings?drive_connected=1`)
  } catch (err) {
    console.error('Drive link callback error:', err)
    return NextResponse.redirect(`${origin}/settings?drive_error=server_error`)
  }
}
