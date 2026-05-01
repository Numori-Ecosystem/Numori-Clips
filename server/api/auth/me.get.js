import { requireAuth } from '../../utils/auth.js'
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  const result = await query(
    'SELECT id, email, name, avatar_url, created_at, privacy_no_tracking, email_verified, password_recovery_enabled, session_duration, app_lock_settings, privacy_screen_enabled FROM users WHERE id = $1',
    [auth.userId],
  )

  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const user = result.rows[0]

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    privacyNoTracking: user.privacy_no_tracking,
    emailVerified: user.email_verified,
    passwordRecoveryEnabled: user.password_recovery_enabled,
    sessionDuration: user.session_duration,
    appLockSettings: user.app_lock_settings
      ? typeof user.app_lock_settings === 'string'
        ? JSON.parse(user.app_lock_settings)
        : user.app_lock_settings
      : null,
    privacyScreenEnabled: user.privacy_screen_enabled,
  }
})
