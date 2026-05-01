import { query } from '../../utils/db.js'

/**
 * POST /api/auth/verify-recovery
 * Body: { email, code }
 * Verifies the password recovery OTP and returns a short-lived recovery token.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, code } = body || {}

  if (!email || !code) {
    throw createError({ statusCode: 400, statusMessage: 'Email and code are required' })
  }

  const emailNorm = email.toLowerCase().trim()

  const result = await query(
    'SELECT id, otp_code, otp_expires_at, otp_purpose, password_recovery_enabled FROM users WHERE email = $1',
    [emailNorm],
  )

  if (result.rows.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid code' })
  }

  const user = result.rows[0]

  if (!user.password_recovery_enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password recovery is not enabled for this account',
    })
  }

  if (user.otp_purpose !== 'password_recovery') {
    throw createError({
      statusCode: 400,
      statusMessage: 'No pending recovery. Request a new code.',
    })
  }

  if (!user.otp_code || new Date(user.otp_expires_at) < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Code has expired. Request a new one.' })
  }

  if (user.otp_code !== code.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid code' })
  }

  // Generate a short-lived recovery token (15 min)
  const { signJwt } = await import('../../utils/auth.js')
  const secret = process.env.JWT_SECRET
  const recoveryToken = await signJwt(
    { userId: user.id, email: emailNorm, purpose: 'password_recovery' },
    secret,
    15 * 60, // 15 minutes
  )

  // Clear OTP so it can't be reused
  await query(
    'UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_purpose = NULL, updated_at = NOW() WHERE id = $1',
    [user.id],
  )

  return { recoveryToken }
})
