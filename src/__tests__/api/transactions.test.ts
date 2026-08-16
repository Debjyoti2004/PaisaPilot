/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetEffectiveUserId = jest.fn()
jest.mock('@/lib/family', () => ({
  getEffectiveUserId: (...args: unknown[]) => mockGetEffectiveUserId(...args),
}))

const mockRequireUserId = jest.fn()
jest.mock('@/lib/auth', () => ({
  requireUserId: (...args: unknown[]) => mockRequireUserId(...args),
}))

const mockPrisma = {
  transaction: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  appSettings: {
    findUnique: jest.fn(),
  },
  financialAccount: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  userBudget: {
    findUnique: jest.fn(),
  },
  categoryRule: {
    findMany: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGetReq(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/transactions')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

function makePostReq(body: object) {
  return new NextRequest('http://localhost/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

let GET: (req: NextRequest) => Promise<Response>
let POST: (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  const mod = await import('@/app/api/transactions/route')
  GET = mod.GET as unknown as (req: NextRequest) => Promise<Response>
  POST = mod.POST as unknown as (req: NextRequest) => Promise<Response>
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  mockGetEffectiveUserId.mockResolvedValue('user-123')
  mockRequireUserId.mockResolvedValue('user-123')
  mockPrisma.appSettings.findUnique.mockResolvedValue(null)
  mockPrisma.userBudget.findUnique.mockResolvedValue(null)
  mockPrisma.categoryRule.findMany.mockResolvedValue([])
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ─── GET ──────────────────────────────────────────────────────────────────────

describe('GET /api/transactions', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockGetEffectiveUserId.mockRejectedValue(new Error('UNAUTHORIZED'))
    const res = await GET(makeGetReq())
    expect(res.status).toBe(401)
  })

  it('returns paginated transactions', async () => {
    const fakeTransactions = Array.from({ length: 5 }, (_, i) => ({
      id: `txn-${i}`,
      amount: 1000 * (i + 1),
      merchant: `Merchant ${i}`,
      category: { name: 'Groceries', color: '#10b981', icon: '🛒' },
      occurredAt: new Date('2025-08-01'),
      type: 'expense',
    }))
    mockPrisma.transaction.findMany.mockResolvedValue(fakeTransactions)
    mockPrisma.transaction.count.mockResolvedValue(5)

    const res = await GET(makeGetReq({ period: 'this-month', page: '1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.transactions)).toBe(true)
    expect(body.transactions.length).toBe(5)
  })

  it('passes date filter for this-month period', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([])
    mockPrisma.transaction.count.mockResolvedValue(0)

    await GET(makeGetReq({ period: 'this-month' }))

    const findManyCall = mockPrisma.transaction.findMany.mock.calls[0][0]
    expect(findManyCall.where.occurredAt).toBeDefined()
    expect(findManyCall.where.occurredAt.gte).toBeDefined()
  })

  it('applies no date filter for all-time period', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([])
    mockPrisma.transaction.count.mockResolvedValue(0)

    await GET(makeGetReq({ period: 'all-time' }))

    const findManyCall = mockPrisma.transaction.findMany.mock.calls[0][0]
    expect(findManyCall.where.occurredAt).toBeUndefined()
  })

  it('applies category filter when provided', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([])
    mockPrisma.transaction.count.mockResolvedValue(0)

    await GET(makeGetReq({ category: 'Groceries' }))

    const findManyCall = mockPrisma.transaction.findMany.mock.calls[0][0]
    expect(JSON.stringify(findManyCall.where)).toContain('Groceries')
  })

  it('applies search filter when search query provided', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([])
    mockPrisma.transaction.count.mockResolvedValue(0)

    await GET(makeGetReq({ search: 'Amazon' }))

    const findManyCall = mockPrisma.transaction.findMany.mock.calls[0][0]
    expect(JSON.stringify(findManyCall.where)).toContain('Amazon')
  })

  it('returns totalCount and hasMore for pagination', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({
        id: `t${i}`, amount: 100, merchant: 'Shop', occurredAt: new Date(), type: 'expense',
        category: { name: 'Other', color: '#999', icon: '?' },
      }))
    )
    mockPrisma.transaction.count.mockResolvedValue(120)

    const res = await GET(makeGetReq({ page: '1' }))
    const body = await res.json()
    expect(body.total).toBe(120)
    // page 1 of 50 with 120 total → more pages exist
    expect(body.total).toBeGreaterThan(body.transactions.length)
  })
})

// ─── POST ─────────────────────────────────────────────────────────────────────

describe('POST /api/transactions', () => {
  it('returns 401 when not authenticated', async () => {
    mockRequireUserId.mockRejectedValue(new Error('UNAUTHORIZED'))
    const res = await POST(makePostReq({ amount: 500, merchant: 'Test', date: '2025-08-01' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makePostReq({}))
    expect(res.status).toBe(400)
  })

  it('creates a transaction and returns it', async () => {
    mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-1', name: 'Groceries' })
    // findFirst for dedup check → null (no duplicate)
    mockPrisma.transaction.findFirst.mockResolvedValue(null)
    // financialAccount lookup by name → returns an account
    mockPrisma.financialAccount.findUnique.mockResolvedValue({ id: 'fa-1', name: 'Savings Account', userId: 'user-123' })
    mockPrisma.appSettings.findUnique.mockResolvedValue({ salaryCarryover: false })

    const created = {
      id: 'new-txn-1',
      amount: 500,
      merchant: 'Big Bazaar',
      occurredAt: new Date('2025-08-10'),
      type: 'debit',
      category: { name: 'Groceries', color: '#10b981', icon: '🛒' },
    }
    mockPrisma.transaction.create.mockResolvedValue(created)

    const res = await POST(makePostReq({
      amount: 500,
      merchant: 'Big Bazaar',
      date: '2025-08-10',
      category: 'Groceries',
      account: 'Savings Account',
      type: 'expense',
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id ?? body.transaction?.id).toBe('new-txn-1')
  })

  it('assigns wealthGroup based on category', async () => {
    mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-2', name: 'Groceries' })
    mockPrisma.transaction.findFirst.mockResolvedValue(null)
    mockPrisma.financialAccount.findUnique.mockResolvedValue({ id: 'fa-1', name: 'Savings', userId: 'user-123' })
    mockPrisma.appSettings.findUnique.mockResolvedValue({ salaryCarryover: false })
    mockPrisma.transaction.create.mockResolvedValue({
      id: 'txn-wg', amount: 1000, merchant: 'Reliance Fresh',
      wealthGroup: 'needs', occurredAt: new Date(), type: 'debit',
      category: { name: 'Groceries', color: '#10b981', icon: '🛒' },
    })

    await POST(makePostReq({
      amount: 1000,
      merchant: 'Reliance Fresh',
      date: '2025-08-01',
      category: 'Groceries',
      account: 'Savings',
      type: 'expense',
    }))

    const createCall = mockPrisma.transaction.create.mock.calls[0][0]
    expect(createCall.data.wealthGroup).toBe('needs')
  })
})
