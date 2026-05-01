import { requireAuth } from '../../../utils/auth.js'
import { revokeSession } from '../../../utils/session.js'

/**
 * DELETE /api/auth/sessions/:id
 * Revokes a specific session by id.
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const sessionId = parseInt(getRouterParam(event, 'id'), 10)

  if (!sessionId || isNaN(sessionId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid session id' })
  }

  const deleted = await revokeSession(auth.userId, sessionId)
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found' })
  }

  return { ok: true }
})
