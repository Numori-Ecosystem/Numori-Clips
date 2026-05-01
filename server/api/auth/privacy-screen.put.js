import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'

/**
 * PUT /api/auth/privacy-screen — Toggle privacy screen preference.
 * Body: { enabled: boolean }
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody(event)
  const { enabled } = body || {}

  if (typeof enabled !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'enabled must be a boolean' })
  }

  await query('UPDATE users SET privacy_screen_enabled = $1, updated_at = NOW() WHERE id = $2', [
    enabled,
    auth.userId,
  ])

  return { privacyScreenEnabled: enabled }
})
