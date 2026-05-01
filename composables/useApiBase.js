/**
 * Returns the API base URL. Empty string for same-origin (web),
 * or the configured server URL for native Capacitor builds.
 *
 * Set NUXT_PUBLIC_API_BASE in .env or at build time for native apps.
 */
export const useApiBase = () => {
  const config = useRuntimeConfig()
  return config.public.apiBase || ''
}
