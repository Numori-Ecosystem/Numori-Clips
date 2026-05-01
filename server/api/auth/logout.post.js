import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'

/**
 * POST /api/auth/logout
 * Revokes the current session on the server side.
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  await query('DELETE FROM sessions WHERE token_hash = $1 AND user_id = $2', [
    auth.tokenHash,
    auth.userId,
  ])
  return { ok: true }
})
