import bcrypt from 'bcryptjs'
import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'
import { revokeAllSessions } from '../../utils/session.js'

/**
 * PUT /api/auth/password — Change password.
 *
 * Body: { currentAuthKey, newAuthKey }
 *
 * The client sends:
 *   - currentAuthKey: derived from the current password via PBKDF2
 *   - newAuthKey: derived from the new password via PBKDF2
 *
 * The server verifies the current credential, updates the hash to
 * hash(newAuthKey), and revokes all sessions.
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody(event)
  const { currentAuthKey, newAuthKey } = body || {}

  if (!currentAuthKey || !newAuthKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Current and new credentials are required',
    })
  }

  const result = await query('SELECT password_hash FROM users WHERE id = $1', [auth.userId])
  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const valid = await bcrypt.compare(currentAuthKey, result.rows[0].password_hash)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Current password is incorrect' })
  }

  // Update password hash
  const newHash = await bcrypt.hash(newAuthKey, 12)
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    newHash,
    auth.userId,
  ])

  // Revoke all sessions — user must re-login with new password
  await revokeAllSessions(auth.userId)

  return { updated: true }
})
