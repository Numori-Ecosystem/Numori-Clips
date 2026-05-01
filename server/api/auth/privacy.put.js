import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'

/**
 * PUT /api/auth/privacy — Update user privacy preferences.
 * Body: { noTracking: boolean }
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody(event)
  const { noTracking } = body || {}

  if (typeof noTracking !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'noTracking must be a boolean' })
  }

  await query('UPDATE users SET privacy_no_tracking = $1, updated_at = NOW() WHERE id = $2', [
    noTracking,
    auth.userId,
  ])

  return { privacyNoTracking: noTracking }
})
