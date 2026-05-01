import bcrypt from 'bcryptjs'
import { query } from '../../utils/db.js'
import { signJwt } from '../../utils/auth.js'
import { createSession } from '../../utils/session.js'

/**
 * POST /api/auth/login
 * Body: { email, authKey }
 *
 * Client sends `authKey` derived from password via PBKDF2.
 * Server compares against hash(authKey) stored in the DB.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, authKey } = body || {}

  if (!email || !authKey) {
    throw createError({ statusCode: 400, statusMessage: 'Email and credentials are required' })
  }

  const emailNorm = email.toLowerCase().trim()

  const result = await query(
    'SELECT id, email, name, password_hash, avatar_url, created_at, email_verified, session_duration FROM users WHERE email = $1',
    [emailNorm],
  )

  if (result.rows.length === 0) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  const user = result.rows[0]

  const valid = await bcrypt.compare(authKey, user.password_hash)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  const secret = process.env.JWT_SECRET
  const token = await signJwt({ userId: user.id, email: user.email }, secret)

  // Track session — expires_at based on user's session_duration preference
  const sessionDuration = user.session_duration || 7 * 24 * 3600
  await createSession(user.id, token, event, sessionDuration)

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      emailVerified: user.email_verified,
    },
    token,
  }
})
