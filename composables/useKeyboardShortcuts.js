/**
 * Composable for global keyboard shortcuts.
 *
 * Uses a capture-phase keydown listener to preventDefault and dispatch
 * app actions. Most Ctrl/Cmd shortcuts can be intercepted this way.
 *
 * Firefox does NOT allow preventDefault on Ctrl+N (new window) — this
 * is a known, long-standing browser limitation. As a workaround,
 * "New Note" is bound to Ctrl/Cmd+Shift+N instead.
 */

export const useKeyboardShortcuts = (handlers = {}) => {
  const isMac = computed(() => {
    if (import.meta.server) return false
    return navigator.userAgent?.toUpperCase().includes('MAC')
  })

  const modLabel = computed(() => (isMac.value ? '⌘' : 'Ctrl'))

  const shortcutMap = {
    s: 'save',
    o: 'openFile',
    p: 'print',
    e: 'exportText',
    h: 'help',
  }

  const shiftShortcutMap = {
    n: 'newNote',
    s: 'exportAll',
    d: 'duplicate',
    f: 'toggleFocus',
  }

  const onKeydown = (e) => {
    if (!e.ctrlKey && !e.metaKey) return
    if (e.altKey) return

    const key = e.key.toLowerCase()

    if (e.shiftKey) {
      const action = shiftShortcutMap[key]
      if (action && handlers[action]) {
        e.preventDefault()
        handlers[action]()
      }
      return
    }

    const action = shortcutMap[key]
    if (action && handlers[action]) {
      e.preventDefault()
      handlers[action]()
    }
  }

  if (import.meta.client) {
    useEventListener(document, 'keydown', onKeydown, { capture: true })
  }

  return { isMac, modLabel, handlers }
}
