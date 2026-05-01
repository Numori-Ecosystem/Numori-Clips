/**
 * useBackButton — Manages a stack of back-button handlers for Capacitor apps.
 *
 * Components register handlers when they mount/open and unregister when they close.
 * The topmost handler on the stack gets called when the hardware back button is pressed.
 * This allows modals, prompts, and drawers to intercept back navigation in priority order.
 *
 * Handlers are called in LIFO order (last registered = first to handle).
 * A handler should return `true` if it consumed the event, or `false` to let it propagate.
 *
 * @example
 * const { register, unregister } = useBackButton()
 * const id = register(() => { closeMyModal(); return true })
 * // later:
 * unregister(id)
 */

const handlers = ref([])
let nextId = 0

export const useBackButton = () => {
  /**
   * Register a back-button handler.
   * @param {() => boolean} handler — Return true if the event was consumed.
   * @param {number} [priority=0] — Higher priority handlers are called first among same-level entries.
   * @returns {number} id — Use to unregister later.
   */
  const register = (handler, priority = 0) => {
    const id = nextId++
    handlers.value.push({ id, handler, priority })
    return id
  }

  /**
   * Unregister a previously registered handler.
   * @param {number} id
   */
  const unregister = (id) => {
    const idx = handlers.value.findIndex((h) => h.id === id)
    if (idx !== -1) handlers.value.splice(idx, 1)
  }

  /**
   * Invoke the topmost handler. Called by the backbutton plugin.
   * @returns {boolean} true if a handler consumed the event.
   */
  const invoke = () => {
    if (handlers.value.length === 0) return false
    // Sort by priority descending, then by id descending (most recent first)
    const sorted = [...handlers.value].sort((a, b) => b.priority - a.priority || b.id - a.id)
    for (const entry of sorted) {
      if (entry.handler()) return true
    }
    return false
  }

  /** Whether any handlers are registered. */
  const hasHandlers = computed(() => handlers.value.length > 0)

  return { register, unregister, invoke, hasHandlers }
}
