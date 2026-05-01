/**
 * PWA service worker registration with update detection.
 * Skipped inside Capacitor's webview — native apps don't use service workers,
 * but they still check for updates via the version endpoint.
 */
export default defineNuxtPlugin(() => {
  const isCapacitor = !!/** @type {any} */ (window).Capacitor

  if (!isCapacitor && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Check for updates periodically (every 30 minutes)
        setInterval(() => registration.update(), 30 * 60 * 1000)

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            // A new SW is installed and waiting — notify the app
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(
                new CustomEvent('sw-update-available', { detail: { registration } }),
              )
            }
          })
        })

        // Handle controller change (after skipWaiting) — reload to activate new version
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return
          refreshing = true
          window.location.reload()
        })
      })
      .catch(() => {})
  }
})
