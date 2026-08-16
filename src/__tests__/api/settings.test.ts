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
  appSettings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

let GET: () => Promise<Response>
let PATCH: (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  const mod = await import('@/app/api/settings/route')
  GET = mod.GET as unknown as () => Promise<Response>
  PATCH = mod.PATCH as unknown as (req: NextRequest) => Promise<Response>
})

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireUserId.mockResolvedValue('user-123')
})

// ─── GET ──────────────────────────────────────────────────────────────────────

describe('GET /api/settings', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockRequireUserId.mockRejectedValue(new Error('UNAUTHORIZED'))
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('upserts settings with all default accounts when none exist', async () => {
    mockPrisma.appSettings.findUnique.mockResolvedValue(null)
    const mockSettings = {
      customAccounts: JSON.stringify([
        { name: 'Savings Account', type: 'savings' },
        { name: 'Salary Account',  type: 'savings' },
        { name: 'Cash',            type: 'checking' },
        { name: 'Credit Card',     type: 'credit_card' },
        { name: 'Debit Card',      type: 'debit_card' },
      ]),
      dashboardWidgets: JSON.stringify([
        'Savings Account','Salary Account','Cash','Credit Card','Debit Card',
      ]),
    }
    mockPrisma.appSettings.upsert.mockResolvedValue(mockSettings)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings).toBeDefined()
    expect(mockPrisma.appSettings.upsert).toHaveBeenCalled()
  })

  it('merges missing default accounts into existing customAccounts', async () => {
    mockPrisma.appSettings.findUnique.mockResolvedValue({
      customAccounts: JSON.stringify([{ name: 'Savings Account', type: 'savings' }]),
      dashboardWidgets: JSON.stringify(['Savings Account']),
    })
    const merged = {
      customAccounts: JSON.stringify([
        { name: 'Savings Account', type: 'savings' },
        { name: 'Salary Account',  type: 'savings' },
        { name: 'Cash',            type: 'checking' },
        { name: 'Credit Card',     type: 'credit_card' },
        { name: 'Debit Card',      type: 'debit_card' },
      ]),
      dashboardWidgets: JSON.stringify(['Savings Account','Salary Account','Cash','Credit Card','Debit Card']),
    }
    mockPrisma.appSettings.upsert.mockResolvedValue(merged)

    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ customAccounts: expect.any(String) }),
      })
    )
    const updateArg = mockPrisma.appSettings.upsert.mock.calls[0][0].update
    const parsed = JSON.parse(updateArg.customAccounts)
    expect(parsed.length).toBeGreaterThan(1)
  })

  it('does not call upsert when all default accounts already exist', async () => {
    const allAccounts = [
      { name: 'Savings Account', type: 'savings' },
      { name: 'Salary Account',  type: 'savings' },
      { name: 'Cash',            type: 'checking' },
      { name: 'Credit Card',     type: 'credit_card' },
      { name: 'Debit Card',      type: 'debit_card' },
    ]
    mockPrisma.appSettings.findUnique.mockResolvedValue({
      customAccounts: JSON.stringify(allAccounts),
      dashboardWidgets: JSON.stringify(allAccounts.map(a => a.name)),
    })

    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockPrisma.appSettings.upsert).not.toHaveBeenCalled()
  })
})

// ─── PATCH ────────────────────────────────────────────────────────────────────

describe('PATCH /api/settings', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockRequireUserId.mockRejectedValue(new Error('UNAUTHORIZED'))
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedSalary: 75000 }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('updates expectedSalary', async () => {
    mockPrisma.appSettings.upsert.mockResolvedValue({ expectedSalary: 75_000 })
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedSalary: 75_000 }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings).toBeDefined()
    const upsertCall = mockPrisma.appSettings.upsert.mock.calls[0][0]
    expect(upsertCall.update.expectedSalary).toBe(75_000)
  })

  it('serializes dashboardWidgets array to JSON string', async () => {
    mockPrisma.appSettings.upsert.mockResolvedValue({})
    const widgets = ['Savings Account', 'Credit Card']
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboardWidgets: widgets }),
    })
    await PATCH(req)
    const upsertCall = mockPrisma.appSettings.upsert.mock.calls[0][0]
    expect(upsertCall.update.dashboardWidgets).toBe(JSON.stringify(widgets))
  })

  it('serializes customAccounts array to JSON string', async () => {
    mockPrisma.appSettings.upsert.mockResolvedValue({})
    const accounts = [{ name: 'My Savings', type: 'savings' }]
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customAccounts: accounts }),
    })
    await PATCH(req)
    const upsertCall = mockPrisma.appSettings.upsert.mock.calls[0][0]
    expect(upsertCall.update.customAccounts).toBe(JSON.stringify(accounts))
  })

  it('ignores undefined fields and does not set them', async () => {
    mockPrisma.appSettings.upsert.mockResolvedValue({})
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailReports: true }),
    })
    await PATCH(req)
    const upsertCall = mockPrisma.appSettings.upsert.mock.calls[0][0]
    expect(upsertCall.update.expectedSalary).toBeUndefined()
    expect(upsertCall.update.emailReports).toBe(true)
  })
})
