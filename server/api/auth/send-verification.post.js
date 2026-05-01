import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'
import { generateOtp, sendVerificationEmail } from '../../utils/email.js'

/**
 * POST /api/auth/send-verification
 * Sends (or re-sends) an email verification OTP to the logged-in user.
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  const result = await query('SELECT email, email_verified FROM users WHERE id = $1', [auth.userId])
  if (result.rows.length === 0)
    throw createError({ statusCode: 404, statusMessage: 'User not found' })

  if (result.rows[0].email_verified) {
    throw createError({ statusCode: 400, statusMessage: 'Email is already verified' })
  }

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  await query(
    'UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_purpose = $3, updated_at = NOW() WHERE id = $4',
    [code, expiresAt.toISOString(), 'email_verification', auth.userId],
  )

  const emailResult = await sendVerificationEmail(result.rows[0].email, code)

  if (emailResult.error) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to send verification email. Please try again later.',
    })
  }

  return { sent: true }
})
