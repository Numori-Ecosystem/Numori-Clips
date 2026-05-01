import { createError } from 'h3'

/**
 * Minimal JWT implementation using Web Crypto API (no dependencies).
 * Supports HS256 (HMAC-SHA256) signing and verification.
 */

function base64UrlEncode(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  return Buffer.from(str).toString('base64url')
}

function base64UrlDecode(str) {
  return JSON.parse(Buffer.from(str, 'base64url').toString())
}

async function getKey(secret) {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signJwt(payload, secret, expiresInSeconds = 10 * 365 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + expiresInSeconds }

  const data = `${base64UrlEncode(header)}.${base64UrlEncode(body)}`
  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const signature = Buffer.from(sig).toString('base64url')

  return `${data}.${signature}`
}

export async function verifyJwt(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token')

  const [headerB64, payloadB64, signatureB64] = parts
  const key = await getKey(secret)
  const data = `${headerB64}.${payloadB64}`
  const signature = Buffer.from(signatureB64, 'base64url')

  const valid = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(data))
  if (!valid) throw new Error('Invalid signature')

  const payload = base64UrlDecode(payloadB64)
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }

  return payload
}

/**
 * Extract and verify the JWT from the Authorization header.
 * Also validates the session exists (hasn't been revoked) and updates last_used_at.
 * Returns the decoded payload (with tokenHash attached) or throws a 401 error.
 */
export async function requireAuth(event) {
  const header = getHeader(event, 'authorization')
  if (!header?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Missing or invalid authorization header' })
  }

  const token = header.slice(7)
  const secret = process.env.JWT_SECRET

  let payload
  try {
    payload = await verifyJwt(token, secret)
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }

  // Validate session exists (not revoked) and touch last_used_at
  const { hashToken, touchSession } = await import('./session.js')
  const tokenHash = await hashToken(token)
  const session = await touchSession(tokenHash)
  if (!session) {
    // Session was revoked — token is valid but session deleted
    throw createError({ statusCode: 401, statusMessage: 'Session revoked' })
  }

  payload.tokenHash = tokenHash
  return payload
}

/**
 * Optionally extract user from JWT. Returns null if no valid token.
 */
export async function optionalAuth(event) {
  const header = getHeader(event, 'authorization')
  if (!header?.startsWith('Bearer ')) return null

  const token = header.slice(7)
  const secret = process.env.JWT_SECRET

  try {
    return await verifyJwt(token, secret)
  } catch {
    return null
  }
}
