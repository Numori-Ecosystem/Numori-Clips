import bcrypt from 'bcryptjs'
import { verifyJwt, signJwt } from '../../utils/auth.js'
import { query } from '../../utils/db.js'
import { createSession, revokeAllSessions } from '../../utils/session.js'

/**
 * POST /api/auth/reset-password
 * Body: { recoveryToken, newAuthKey }
 *
 * Resets the password using a verified recovery token.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { recoveryToken, newAuthKey } = body || {}

  if (!recoveryToken || !newAuthKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Recovery token and new credentials are required',
    })
  }

  const secret = process.env.JWT_SECRET
  let payload
  try {
    payload = await verifyJwt(recoveryToken, secret)
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired recovery token' })
  }

  if (payload.purpose !== 'password_recovery') {
    throw createError({ statusCode: 401, statusMessage: 'Invalid recovery token' })
  }

  // Update password hash
  const newHash = await bcrypt.hash(newAuthKey, 12)
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    newHash,
    payload.userId,
  ])

  // Revoke all existing sessions
  await revokeAllSessions(payload.userId)

  // Issue a fresh login token
  const token = await signJwt({ userId: payload.userId, email: payload.email }, secret)

  // Track session — expires_at based on user's session_duration preference
  const userRow = await query('SELECT session_duration FROM users WHERE id = $1', [payload.userId])
  const sessionDuration = userRow.rows[0]?.session_duration || 7 * 24 * 3600
  await createSession(payload.userId, token, event, sessionDuration)

  const result = await query(
    'SELECT id, email, name, avatar_url, created_at, email_verified FROM users WHERE id = $1',
    [payload.userId],
  )
  const user = result.rows[0]

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
