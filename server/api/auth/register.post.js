import bcrypt from 'bcryptjs'
import { query } from '../../utils/db.js'
import { signJwt } from '../../utils/auth.js'
import { generateOtp, sendVerificationEmail } from '../../utils/email.js'
import { createSession } from '../../utils/session.js'

/**
 * POST /api/auth/register
 *
 * Body: { email, authKey, name? }
 *
 * The client derives an authKey from the user's password via PBKDF2.
 * We store hash(authKey) — the raw password never reaches the server.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, authKey, name } = body || {}

  if (!email || !authKey) {
    throw createError({ statusCode: 400, statusMessage: 'Email and credentials are required' })
  }

  if (authKey.length < 16) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid credentials' })
  }

  const emailNorm = email.toLowerCase().trim()

  const existing = await query('SELECT id FROM users WHERE email = $1', [emailNorm])
  if (existing.rows.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'An account with this email already exists',
    })
  }

  const passwordHash = await bcrypt.hash(authKey, 12)

  const result = await query(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
    [emailNorm, (name || '').trim(), passwordHash],
  )

  const user = result.rows[0]
  const secret = process.env.JWT_SECRET
  const token = await signJwt({ userId: user.id, email: user.email }, secret)

  // Track session
  await createSession(user.id, token, event)

  // Send verification email (non-blocking — don't fail registration if email fails)
  try {
    const code = generateOtp()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    await query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_purpose = $3 WHERE id = $4',
      [code, expiresAt.toISOString(), 'email_verification', user.id],
    )
    await sendVerificationEmail(emailNorm, code)
  } catch (err) {
    console.error('[register] Failed to send verification email:', err.message)
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
      emailVerified: false,
    },
    token,
  }
})
