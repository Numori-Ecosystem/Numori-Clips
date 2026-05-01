import { query } from './db.js'

/**
 * Hash a JWT token to store in the sessions table.
 * We don't store the raw token — just a SHA-256 hash for lookup.
 */
export async function hashToken(token) {
  const data = new TextEncoder().encode(token)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Buffer.from(hash).toString('hex')
}

/**
 * Parse a user-agent string into a friendly device name.
 * If `deviceInfo` is provided (from the X-Device-Info header sent by
 * Capacitor apps), it takes priority and includes platform + model.
 */
export function parseDeviceName(ua, deviceInfo) {
  // Native Capacitor apps send "android; Pixel 8 Pro" or "ios; iPhone" etc.
  if (deviceInfo) {
    const parts = deviceInfo.split(';').map((s) => s.trim())
    const platform = (parts[0] || '').toLowerCase()
    const model = parts[1] || ''

    if (platform === 'android') {
      return model ? `Android · ${model}` : 'Android App'
    }
    if (platform === 'ios') {
      return model ? `iOS · ${model}` : 'iOS App'
    }
    // Unknown native platform
    return model ? `Mobile · ${model}` : 'Mobile App'
  }

  if (!ua) return 'Unknown device'

  // Fallback: check for Capacitor token in UA (some builds include it)
  if (ua.includes('Capacitor')) {
    if (ua.includes('Android')) return 'Android App'
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS App'
    return 'Mobile App'
  }

  // Detect OS
  let os = 'Unknown OS'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('CrOS')) os = 'ChromeOS'

  // Detect browser
  let browser = ''
  if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera'
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'

  return browser ? `${browser} on ${os}` : os
}

/**
 * Create a session record for a newly issued token.
 * Location is resolved asynchronously via IP geolocation.
 * @param {number} expiresInSeconds — token lifetime; stored as expires_at on the session row.
 */
export async function createSession(userId, token, event, expiresInSeconds = 7 * 24 * 3600) {
  const tokenHash = await hashToken(token)
  const ua = getHeader(event, 'user-agent') || ''
  const deviceInfo = getHeader(event, 'x-device-info') || ''
  const deviceName = parseDeviceName(ua, deviceInfo)

  const ip =
    getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    getHeader(event, 'x-real-ip') ||
    event.node?.req?.socket?.remoteAddress ||
    null

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

  const result = await query(
    `INSERT INTO sessions (user_id, token_hash, device_name, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, tokenHash, deviceName, ip, expiresAt.toISOString()],
  )

  const sessionId = result.rows[0]?.id
  // Location enrichment can be added here if needed
  void sessionId
}

/**
 * Update last_used_at for a session identified by token hash.
 * Returns the session row or null if not found (revoked).
 * Enforces server-side expiry and slides the window forward on each touch
 * based on the user's session_duration preference.
 */
export async function touchSession(tokenHash) {
  const result = await query(
    `SELECT s.id, s.expires_at, s.user_id, u.session_duration
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1`,
    [tokenHash],
  )
  const session = result.rows[0]
  if (!session) return null

  // Enforce server-side expiry
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    await query('DELETE FROM sessions WHERE id = $1', [session.id])
    return null
  }

  // Slide expires_at forward from now based on user's session_duration
  const duration = session.session_duration || 7 * 24 * 3600
  const newExpiresAt = new Date(Date.now() + duration * 1000)
  await query(`UPDATE sessions SET last_used_at = NOW(), expires_at = $1 WHERE id = $2`, [
    newExpiresAt.toISOString(),
    session.id,
  ])

  return session
}

/**
 * Delete all sessions for a user except the current one.
 */
export async function revokeOtherSessions(userId, currentTokenHash) {
  await query('DELETE FROM sessions WHERE user_id = $1 AND token_hash != $2', [
    userId,
    currentTokenHash,
  ])
}

/**
 * Delete a specific session by id (must belong to user).
 */
export async function revokeSession(userId, sessionId) {
  const result = await query('DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING id', [
    sessionId,
    userId,
  ])
  return result.rows.length > 0
}

/**
 * Delete all sessions for a user.
 */
export async function revokeAllSessions(userId) {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId])
}

/**
 * Delete all sessions whose expires_at has passed.
 * Returns the number of rows removed.
 */
export async function purgeExpiredSessions() {
  const result = await query(
    `DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < NOW()`,
  )
  return result.rowCount || 0
}
