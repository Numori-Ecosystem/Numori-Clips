/**
 * CORS middleware — handles cross-origin requests for all API routes.
 *
 * When CORS_ORIGINS is set, only those origins are allowed and credentials
 * are permitted. When empty (dev), any origin is accepted.
 *
 * Capacitor default origins are always included:
 *   - https://localhost  (Android, Capacitor 5+)
 *   - capacitor://localhost (iOS)
 */
const capacitorOrigins = ['https://localhost', 'capacitor://localhost']

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const allowedOrigins = [...new Set([...capacitorOrigins, ...configuredOrigins])]

export default defineEventHandler((event) => {
  if (!getRequestURL(event).pathname.startsWith('/api/')) return

  const requestOrigin = getHeader(event, 'origin') || ''

  // Determine the Access-Control-Allow-Origin value:
  // - Always allow Capacitor default origins
  // - If CORS_ORIGINS is configured, also allow those
  // - If CORS_ORIGINS is empty (dev), allow any origin
  let allowOrigin
  if (allowedOrigins.includes(requestOrigin)) {
    allowOrigin = requestOrigin
  } else if (!configuredOrigins.length && requestOrigin) {
    // Dev mode (no CORS_ORIGINS set): echo any origin
    allowOrigin = requestOrigin
  } else if (!requestOrigin) {
    // No Origin header (same-origin or non-browser client)
    allowOrigin = '*'
  } else {
    return // origin not in allow-list — skip CORS headers
  }

  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-Info, X-Delete-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  })

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
