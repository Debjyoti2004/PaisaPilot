/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRequireUserId = jest.fn()
jest.mock('@/lib/auth', () => ({
  requireUserId: (...args: unknown[]) => mockRequireUserId(...args),
}))

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  appSettings: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

// Spy on global fetch to prevent real HTTP calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDeleteReq(body: object) {
  return new NextRequest('http://localhost/api/transactions/clear', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Import handlers lazily after mocks are set up
let POST: (req: NextRequest) => Promise<Response>
let DELETE: (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  const mod = await import('@/app/api/transactions/clear/route')
  POST = mod.POST as unknown as (req: NextRequest) => Promise<Response>
  DELETE = mod.DELETE as unknown as (req: NextRequest) => Promise<Response>
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'log').mockImplementation(() => {})
  // Default: authenticated
  mockRequireUserId.mockResolvedValue('user-123')
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ─── POST (request OTP) ──────────────────────────────────────────────────────

describe('POST /api/transactions/clear', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockRequireUserId.mockRejectedValue(new Error('UNAUTHORIZED'))
    const res = await POST(new NextRequest('http://localhost/api/transactions/clear', { method: 'POST' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('returns 400 when user has no email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const res = await POST(new NextRequest('http://localhost/api/transactions/clear', { method: 'POST' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/email not found/i)
  })

  it('stores OTP and returns masked email (dev fallback path)', async () => {
    // In test env, RESEND_API_KEY is unset so sendEmail throws → dev branch runs
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' })
    mockPrisma.appSettings.upsert.mockResolvedValue({})

    const res = await POST(new NextRequest('http://localhost/api/transactions/clear', { method: 'POST' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.maskedEmail).toContain('***@example.com')
    expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
        update: expect.objectContaining({ clearOtp: expect.any(String) }),
      })
    )
  })

  it('stores a 6-digit numeric OTP', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' })
    mockPrisma.appSettings.upsert.mockResolvedValue({})

    await POST(new NextRequest('http://localhost/api/transactions/clear', { method: 'POST' }))

    const upsertCall = mockPrisma.appSettings.upsert.mock.calls[0][0]
    const otp = upsertCall.update.clearOtp
    expect(otp).toMatch(/^\d{6}$/)
  })

  it('returns devOtp in non-production when Resend call fails', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' })
    mockPrisma.appSettings.upsert.mockResolvedValue({})
    mockFetch.mockResolvedValue({ ok: false, text: async () => 'bad request' })

    const res = await POST(new NextRequest('http://localhost/api/transactions/clear', { method: 'POST' }))
    const body = await res.json()
    expect(body.devOtp).toBeDefined()
    expect(body.devOtp).toMatch(/^\d{6}$/)
    delete process.env.RESEND_API_KEY
  })
})

// ─── DELETE (verify OTP + clear) ─────────────────────────────────────────────

describe('DELETE /api/transactions/clear', () => {
  it('returns 401 when not authenticated', async () => {
    mockRequireUserId.mockRejectedValue(new Error('UNAUTHORIZED'))
    const res = await DELETE(makeDeleteReq({ otp: '123456' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when OTP is missing from request body', async () => {
    const res = await DELETE(makeDeleteReq({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/otp required/i)
  })

  it('returns 400 when no OTP was requested (no settings)', async () => {
    mockPrisma.appSettings.findUnique.mockResolvedValue(null)
    const res = await DELETE(makeDeleteReq({ otp: '123456' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/no otp requested/i)
  })

  it('returns 400 when OTP has expired', async () => {
    mockPrisma.appSettings.findUnique.mockResolvedValue({
      clearOtp: '123456',
      clearOtpExpiry: new Date(Date.now() - 1_000), // 1 second ago
    })
    const res = await DELETE(makeDeleteReq({ otp: '123456' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/expired/i)
  })

  it('returns 400 when OTP is incorrect', async () => {
    mockPrisma.appSettings.findUnique.mockResolvedValue({
      clearOtp: '999999',
      clearOtpExpiry: new Date(Date.now() + 10 * 60_000),
    })
    const res = await DELETE(makeDeleteReq({ otp: '123456' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/incorrect otp/i)
  })

  it('clears all transactions and returns success for valid OTP', async () => {
    const validOtp = '123456'
    mockPrisma.appSettings.findUnique.mockResolvedValue({
      clearOtp: validOtp,
      clearOtpExpiry: new Date(Date.now() + 10 * 60_000),
    })
    mockPrisma.$transaction.mockResolvedValue([{ count: 42 }, {}])

    const res = await DELETE(makeDeleteReq({ otp: validOtp }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('trims whitespace from the submitted OTP', async () => {
    const validOtp = '654321'
    mockPrisma.appSettings.findUnique.mockResolvedValue({
      clearOtp: validOtp,
      clearOtpExpiry: new Date(Date.now() + 10 * 60_000),
    })
    mockPrisma.$transaction.mockResolvedValue([{}, {}])

    const res = await DELETE(makeDeleteReq({ otp: `  ${validOtp}  ` }))
    expect(res.status).toBe(200)
  })
})
