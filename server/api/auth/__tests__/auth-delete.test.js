/**
 * Unit tests for server/api/auth/delete.post.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

const mockQuery = vi.fn()
const mockRequireAuth = vi.fn()

vi.mock('../../../utils/db.js', () => ({ query: (...args) => mockQuery(...args) }))
vi.mock('../../../utils/auth.js', () => ({
  requireAuth: (...args) => mockRequireAuth(...args),
}))

globalThis.defineEventHandler = (handler) => handler
globalThis.readBody = vi.fn()
globalThis.createError = (opts) => {
  const err = new Error(opts.statusMessage)
  err.statusCode = opts.statusCode
  return err
}

const handler = (await import('../delete.post.js')).default

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAuth.mockResolvedValue({ userId: 1 })
})

describe('POST /api/auth/delete', () => {
  it('rejects missing authKey', async () => {
    readBody.mockResolvedValue({ type: 'data' })
    await expect(handler({})).rejects.toThrow('Password is required')
  })

  it('rejects wrong authKey', async () => {
    const hash = await bcrypt.hash('correct-key', 4)
    readBody.mockResolvedValue({ type: 'data', authKey: 'wrong-key' })
    mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: hash }] })
    await expect(handler({})).rejects.toThrow('Incorrect password')
  })

  it('handles type=data — returns success', async () => {
    const authKey = 'key'
    const hash = await bcrypt.hash(authKey, 4)
    readBody.mockResolvedValue({ type: 'data', authKey })
    mockQuery
      .mockResolvedValueOnce({ rows: [{ password_hash: hash }] }) // SELECT password

    const result = await handler({})
    expect(result).toEqual({ deleted: 'data' })
  })

  it('handles type=account — deletes account', async () => {
    const authKey = 'key'
    const hash = await bcrypt.hash(authKey, 4)
    readBody.mockResolvedValue({ type: 'account', authKey })
    mockQuery
      .mockResolvedValueOnce({ rows: [{ password_hash: hash }] }) // SELECT password
      .mockResolvedValueOnce({ rows: [] }) // DELETE sessions
      .mockResolvedValueOnce({ rows: [] }) // DELETE users

    const result = await handler({})
    expect(result).toEqual({ deleted: 'account' })
    expect(mockQuery).toHaveBeenCalledTimes(3)
  })

  it('rejects invalid type', async () => {
    const authKey = 'key'
    const hash = await bcrypt.hash(authKey, 4)
    readBody.mockResolvedValue({ type: 'invalid', authKey })
    mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: hash }] })
    await expect(handler({})).rejects.toThrow('Type must be "account" or "data"')
  })
})
