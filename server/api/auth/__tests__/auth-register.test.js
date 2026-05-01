/**
 * Unit tests for server/api/auth/register.post.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// ── Mock Nitro globals + dependencies ────────────────────────────────────

const mockQuery = vi.fn()
const mockSignJwt = vi.fn()

vi.mock('../../../utils/db.js', () => ({ query: (...args) => mockQuery(...args) }))
vi.mock('../../../utils/auth.js', () => ({ signJwt: (...args) => mockSignJwt(...args) }))
vi.mock('../../../utils/session.js', () => ({ createSession: vi.fn() }))
vi.mock('../../../utils/email.js', () => ({
  generateOtp: () => '123456',
  sendVerificationEmail: vi.fn(),
}))

// Nitro globals
globalThis.defineEventHandler = (handler) => handler
globalThis.readBody = vi.fn()
globalThis.createError = (opts) => {
  const err = new Error(opts.statusMessage)
  err.statusCode = opts.statusCode
  err.statusMessage = opts.statusMessage
  return err
}

// Must import AFTER mocks are set up
const handler = (await import('../register.post.js')).default

beforeEach(() => {
  vi.clearAllMocks()
  process.env.JWT_SECRET = 'test-secret'
})

describe('POST /api/auth/register', () => {
  it('rejects missing email', async () => {
    readBody.mockResolvedValue({ authKey: 'a'.repeat(64) })
    await expect(handler({})).rejects.toThrow('Email and credentials are required')
  })

  it('rejects missing authKey', async () => {
    readBody.mockResolvedValue({ email: 'test@example.com' })
    await expect(handler({})).rejects.toThrow('Email and credentials are required')
  })

  it('rejects short authKey', async () => {
    readBody.mockResolvedValue({ email: 'test@example.com', authKey: 'short' })
    await expect(handler({})).rejects.toThrow('Invalid credentials')
  })

  it('rejects duplicate email', async () => {
    readBody.mockResolvedValue({ email: 'test@example.com', authKey: 'a'.repeat(64) })
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }) // existing user
    await expect(handler({})).rejects.toThrow('already exists')
  })

  it('registers successfully with valid input', async () => {
    const authKey = 'a'.repeat(64)
    readBody.mockResolvedValue({ email: 'New@Example.COM', authKey, name: 'Test User' })

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // no existing user
      .mockResolvedValueOnce({
        rows: [{ id: 1, email: 'new@example.com', name: 'Test User', created_at: '2025-01-01' }],
      })

    mockSignJwt.mockResolvedValue('jwt-token-123')

    const result = await handler({})

    expect(result.token).toBe('jwt-token-123')
    expect(result.user.email).toBe('new@example.com')
    expect(result.user.name).toBe('Test User')

    // Verify bcrypt was used on the authKey (second query call has the hash)
    const insertCall = mockQuery.mock.calls[1]
    const storedHash = insertCall[1][2] // password_hash param
    expect(await bcrypt.compare(authKey, storedHash)).toBe(true)
  })

  it('normalizes email to lowercase', async () => {
    readBody.mockResolvedValue({ email: '  TEST@Example.COM  ', authKey: 'a'.repeat(64) })
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@example.com', name: '', created_at: '2025-01-01' }],
    })
    mockSignJwt.mockResolvedValue('token')

    await handler({})

    // First query checks existing user with normalized email
    expect(mockQuery.mock.calls[0][1][0]).toBe('test@example.com')
  })
})
