import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'

/**
 * PUT /api/auth/security
 * Body: { passwordRecoveryEnabled }
 * Toggle security settings for the authenticated user.
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody(event)
  const { passwordRecoveryEnabled } = body || {}

  if (typeof passwordRecoveryEnabled !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid value' })
  }

  await query('UPDATE users SET password_recovery_enabled = $1, updated_at = NOW() WHERE id = $2', [
    passwordRecoveryEnabled,
    auth.userId,
  ])

  return { passwordRecoveryEnabled }
})
