import bcrypt from 'bcryptjs'
import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody(event)
  const { type, authKey } = body || {}

  if (!authKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password is required to confirm this action',
    })
  }

  const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [auth.userId])
  if (userResult.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const valid = await bcrypt.compare(authKey, userResult.rows[0].password_hash)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Incorrect password' })
  }

  if (type === 'data') {
    // Delete all user data (but keep the account)
    // Add domain-specific data deletion here as needed
    return { deleted: 'data' }
  }

  if (type === 'account') {
    await query('DELETE FROM sessions WHERE user_id = $1', [auth.userId])
    await query('DELETE FROM users WHERE id = $1', [auth.userId])
    return { deleted: 'account' }
  }

  throw createError({ statusCode: 400, statusMessage: 'Type must be "account" or "data"' })
})
