/**
 * Detects whether the device likely has a virtual (on-screen) keyboard.
 * Uses UA sniffing + touch capability as a heuristic — there's no
 * reliable direct API for this yet.
 */
export const useHasVirtualKeyboard = () => {
  if (import.meta.server) return { hasVirtualKeyboard: false }

  const ua = navigator.userAgent || ''
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isMobileUA = /Android|iPhone|iPad|iPod/i.test(ua)
  // iPad Safari reports as "Macintosh" since iPadOS 13, catch it via touch + Mac UA
  const isIPadOS = /Macintosh/i.test(ua) && isTouchDevice

  return { hasVirtualKeyboard: isTouchDevice && (isMobileUA || isIPadOS) }
}
