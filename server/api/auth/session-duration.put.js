import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'

/**
 * PUT /api/auth/session-duration
 * Body: { duration } — session lifetime in seconds.
 *
 * Allowed values: 3600 (1h), 86400 (1d), 604800 (7d), 2592000 (30d).
 * Changing the duration only affects future logins — existing sessions keep
 * their original expiry.
 */
const ALLOWED = [3600, 86400, 604800, 2592000]

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody(event)
  const { duration } = body || {}

  if (!ALLOWED.includes(duration)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid session duration' })
  }

  await query('UPDATE users SET session_duration = $1, updated_at = NOW() WHERE id = $2', [
    duration,
    auth.userId,
  ])

  return { ok: true, duration }
})
