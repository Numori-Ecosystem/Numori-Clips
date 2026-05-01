import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'

/**
 * GET /api/auth/sessions
 * Returns all active sessions for the authenticated user.
 * The current session is marked with `isCurrent: true`.
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  const result = await query(
    `SELECT id, device_name, ip_address, location, created_at, last_used_at, expires_at, token_hash
     FROM sessions WHERE user_id = $1 ORDER BY last_used_at DESC`,
    [auth.userId],
  )

  return result.rows.map((s) => ({
    id: s.id,
    deviceName: s.device_name,
    ipAddress: s.ip_address,
    location: s.location,
    createdAt: s.created_at,
    lastUsedAt: s.last_used_at,
    expiresAt: s.expires_at,
    isCurrent: s.token_hash === auth.tokenHash,
  }))
})
