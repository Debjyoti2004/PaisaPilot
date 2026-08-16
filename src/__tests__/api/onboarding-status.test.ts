/**
 * @jest-environment node
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRequireUserId = jest.fn()
jest.mock('@/lib/auth', () => ({
  requireUserId: (...args: unknown[]) => mockRequireUserId(...args),
}))

const mockPrisma = {
  financialAccount: { count: jest.fn() },
  appSettings: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

let GET: () => Promise<Response>

beforeAll(async () => {
  const mod = await import('@/app/api/onboarding/status/route')
  GET = mod.GET as unknown as () => Promise<Response>
})

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireUserId.mockResolvedValue('user-123')
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/onboarding/status', () => {
  it('returns needsOnboarding: false when onboardingCompleted is true', async () => {
    mockPrisma.financialAccount.count.mockResolvedValue(3)
    mockPrisma.appSettings.findUnique.mockResolvedValue({ onboardingCompleted: true })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.needsOnboarding).toBe(false)
  })

  it('auto-completes onboarding for existing user with accounts but flag false', async () => {
    mockPrisma.financialAccount.count.mockResolvedValue(2)
    mockPrisma.appSettings.findUnique.mockResolvedValue({ onboardingCompleted: false })
    mockPrisma.appSettings.update.mockResolvedValue({})

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.needsOnboarding).toBe(false)
    expect(mockPrisma.appSettings.update).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      data: { onboardingCompleted: true },
    })
  })

  it('returns needsOnboarding: true for new user with no accounts and no settings', async () => {
    mockPrisma.financialAccount.count.mockResolvedValue(0)
    mockPrisma.appSettings.findUnique.mockResolvedValue(null)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.needsOnboarding).toBe(true)
  })

  it('returns needsOnboarding: false (graceful) when auth throws', async () => {
    mockRequireUserId.mockRejectedValue(new Error('UNAUTHORIZED'))

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.needsOnboarding).toBe(false)
  })

  it('returns needsOnboarding: false when user has settings but 0 accounts and flag is set', async () => {
    mockPrisma.financialAccount.count.mockResolvedValue(0)
    mockPrisma.appSettings.findUnique.mockResolvedValue({ onboardingCompleted: true })

    const res = await GET()
    const body = await res.json()
    expect(body.needsOnboarding).toBe(false)
  })
})
