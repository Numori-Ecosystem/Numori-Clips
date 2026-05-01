import { requireAuth } from '../../utils/auth.js'
import { revokeOtherSessions } from '../../utils/session.js'

/**
 * DELETE /api/auth/sessions
 * Revokes all sessions except the current one.
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  await revokeOtherSessions(auth.userId, auth.tokenHash)
  return { ok: true }
})
