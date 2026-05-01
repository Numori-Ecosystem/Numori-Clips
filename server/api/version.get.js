/**
 * GET /api/version — returns the deployed app version.
 *
 * Native Capacitor apps use this instead of the static /version.json
 * because /api/ routes get CORS headers from the middleware,
 * while Nitro serves static public/ files without them.
 */
export default defineEventHandler(() => {
  const { appVersion } = useRuntimeConfig()
  return { version: appVersion }
})
