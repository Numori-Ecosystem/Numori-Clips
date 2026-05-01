import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'

/**
 * POST /api/auth/verify-email
 * Body: { code }
 * Verifies the email using the OTP code.
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody(event)
  const { code } = body || {}

  if (!code) throw createError({ statusCode: 400, statusMessage: 'Verification code is required' })

  const result = await query(
    'SELECT otp_code, otp_expires_at, otp_purpose, email_verified FROM users WHERE id = $1',
    [auth.userId],
  )

  if (result.rows.length === 0)
    throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const user = result.rows[0]

  if (user.email_verified) {
    throw createError({ statusCode: 400, statusMessage: 'Email is already verified' })
  }

  if (user.otp_purpose !== 'email_verification') {
    throw createError({
      statusCode: 400,
      statusMessage: 'No pending verification. Request a new code.',
    })
  }

  if (!user.otp_code || new Date(user.otp_expires_at) < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Code has expired. Request a new one.' })
  }

  if (user.otp_code !== code.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid code' })
  }

  await query(
    'UPDATE users SET email_verified = TRUE, otp_code = NULL, otp_expires_at = NULL, otp_purpose = NULL, updated_at = NOW() WHERE id = $1',
    [auth.userId],
  )

  return { verified: true }
})
