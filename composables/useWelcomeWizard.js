import db from '~/db.js'

export const useWelcomeWizard = () => {
  const isOpen = ref(false)
  const completed = ref(false)

  // Load completion state from Dexie — store the promise so callers can await it
  let _ready
  if (import.meta.client) {
    _ready = db.appState.get('welcome_completed').then((row) => {
      completed.value = row?.value === '1'
    }).catch(() => {})
  } else {
    _ready = Promise.resolve()
  }

  const hasCompleted = () => completed.value

  const complete = async () => {
    completed.value = true
    isOpen.value = false
    await db.appState.put({ key: 'welcome_completed', value: '1' })
  }

  /** Await the DB read before deciding — prevents the race condition. */
  const showIfFirstTime = async () => {
    await _ready
    if (!hasCompleted()) {
      isOpen.value = true
    }
  }

  return { isOpen, complete, showIfFirstTime }
}
