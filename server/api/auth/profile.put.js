import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'
import { generateOtp, sendVerificationEmail } from '../../utils/email.js'

/**
 * PUT /api/auth/profile — Update user profile (name, email, avatar_url).
 * If the email changes, email_verified is reset and a new verification OTP is sent.
 */
export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody(event)
  const { name, email, avatarUrl } = body || {}

  // Check if email is actually changing
  let emailChanging = false
  if (email) {
    const emailNorm = email.toLowerCase().trim()
    const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [
      emailNorm,
      auth.userId,
    ])
    if (existing.rows.length > 0) {
      throw createError({ statusCode: 409, statusMessage: 'This email is already in use' })
    }
    const current = await query('SELECT email FROM users WHERE id = $1', [auth.userId])
    if (current.rows[0]?.email !== emailNorm) {
      emailChanging = true
    }
  }

  const result = await query(
    `
    UPDATE users SET
      name = COALESCE($1, name),
      email = COALESCE($2, email),
      avatar_url = COALESCE($3, avatar_url),
      email_verified = CASE WHEN $5 THEN FALSE ELSE email_verified END,
      updated_at = NOW()
    WHERE id = $4
    RETURNING id, email, name, avatar_url, created_at, email_verified
  `,
    [
      name ?? null,
      email ? email.toLowerCase().trim() : null,
      avatarUrl ?? null,
      auth.userId,
      emailChanging,
    ],
  )

  const user = result.rows[0]

  // Send verification email for the new address
  if (emailChanging) {
    try {
      const code = generateOtp()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
      await query(
        'UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_purpose = $3 WHERE id = $4',
        [code, expiresAt.toISOString(), 'email_verification', auth.userId],
      )
      await sendVerificationEmail(user.email, code)
    } catch (err) {
      console.error('[profile] Failed to send verification email:', err.message)
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    emailVerified: user.email_verified,
  }
})
