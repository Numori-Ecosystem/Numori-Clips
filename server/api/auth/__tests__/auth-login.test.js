/**
 * Unit tests for server/api/auth/login.post.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

const mockQuery = vi.fn()
const mockSignJwt = vi.fn()

vi.mock('../../../utils/db.js', () => ({ query: (...args) => mockQuery(...args) }))
vi.mock('../../../utils/auth.js', () => ({ signJwt: (...args) => mockSignJwt(...args) }))
vi.mock('../../../utils/session.js', () => ({ createSession: vi.fn() }))

globalThis.defineEventHandler = (handler) => handler
globalThis.readBody = vi.fn()
globalThis.createError = (opts) => {
  const err = new Error(opts.statusMessage)
  err.statusCode = opts.statusCode
  return err
}

const handler = (await import('../login.post.js')).default

beforeEach(() => {
  vi.clearAllMocks()
  process.env.JWT_SECRET = 'test-secret'
})

describe('POST /api/auth/login', () => {
  it('rejects missing email', async () => {
    readBody.mockResolvedValue({ authKey: 'abc' })
    await expect(handler({})).rejects.toThrow('Email and credentials are required')
  })

  it('rejects missing authKey', async () => {
    readBody.mockResolvedValue({ email: 'test@example.com' })
    await expect(handler({})).rejects.toThrow('Email and credentials are required')
  })

  it('rejects non-existent user', async () => {
    readBody.mockResolvedValue({ email: 'nobody@example.com', authKey: 'abc' })
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await expect(handler({})).rejects.toThrow('Invalid email or password')
  })

  it('succeeds with correct authKey', async () => {
    const authKey = 'a'.repeat(64)
    const hash = await bcrypt.hash(authKey, 4)
    readBody.mockResolvedValue({ email: 'test@example.com', authKey })
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email: 'test@example.com',
          name: 'Test',
          password_hash: hash,
          created_at: '2025-01-01',
          email_verified: false,
        },
      ],
    })
    mockSignJwt.mockResolvedValue('jwt-token')

    const result = await handler({})
    expect(result.token).toBe('jwt-token')
    expect(result.user.email).toBe('test@example.com')
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('rejects wrong authKey', async () => {
    const correctHash = await bcrypt.hash('correct-key', 4)
    readBody.mockResolvedValue({ email: 'test@example.com', authKey: 'wrong-key' })
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email: 'test@example.com',
          name: 'Test',
          password_hash: correctHash,
          created_at: '2025-01-01',
          email_verified: false,
        },
      ],
    })
    await expect(handler({})).rejects.toThrow('Invalid email or password')
  })

  it('normalizes email to lowercase', async () => {
    const authKey = 'a'.repeat(64)
    const hash = await bcrypt.hash(authKey, 4)
    readBody.mockResolvedValue({ email: '  TEST@Example.COM  ', authKey })
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          email: 'test@example.com',
          name: '',
          password_hash: hash,
          created_at: '2025-01-01',
          email_verified: false,
        },
      ],
    })
    mockSignJwt.mockResolvedValue('token')

    await handler({})
    expect(mockQuery.mock.calls[0][1][0]).toBe('test@example.com')
  })
})
