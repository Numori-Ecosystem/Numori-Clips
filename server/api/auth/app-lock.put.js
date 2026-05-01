import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'

/**
 * PUT /api/auth/app-lock
 * Body: { enabled, method, pin, password, timeout, biometricsFallback, selectedBiometrics }
 * Persist app lock settings for the authenticated user.
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody(event)

  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }

  const settings = JSON.stringify({
    enabled: !!body.enabled,
    method: body.method || 'pin',
    pin: body.pin || '',
    password: body.password || '',
    timeout: Number(body.timeout) || 0,
    biometricsFallback: body.biometricsFallback || 'pin',
    selectedBiometrics: Array.isArray(body.selectedBiometrics) ? body.selectedBiometrics : [],
  })

  await query('UPDATE users SET app_lock_settings = $1, updated_at = NOW() WHERE id = $2', [
    settings,
    auth.userId,
  ])

  return { ok: true }
})
