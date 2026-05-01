import { query } from '../../utils/db.js'
import { generateOtp, sendPasswordRecoveryEmail } from '../../utils/email.js'

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Sends a password recovery OTP if the account has recovery enabled.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email } = body || {}

  if (!email) throw createError({ statusCode: 400, statusMessage: 'Email is required' })

  const emailNorm = email.toLowerCase().trim()

  const result = await query('SELECT id, password_recovery_enabled FROM users WHERE email = $1', [
    emailNorm,
  ])

  // Always return success to avoid email enumeration
  if (result.rows.length === 0) return { sent: true }

  const user = result.rows[0]

  if (!user.password_recovery_enabled) {
    // Don't reveal that recovery is disabled — just silently succeed
    return { sent: true }
  }

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  await query(
    'UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_purpose = $3, updated_at = NOW() WHERE id = $4',
    [code, expiresAt.toISOString(), 'password_recovery', user.id],
  )

  const emailResult = await sendPasswordRecoveryEmail(emailNorm, code)

  if (emailResult.error) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to send recovery email. Please try again later.',
    })
  }

  return { sent: true }
})
