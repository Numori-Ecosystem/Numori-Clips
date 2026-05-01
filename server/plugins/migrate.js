import { migrate } from '../utils/migrate.js'

/**
 * Nitro plugin: run database migrations on server start.
 */
export default defineNitroPlugin(async () => {
  try {
    await migrate()
  } catch (err) {
    console.error('[migrate] Failed to run migrations:', err.message, err.stack)
    // Don't crash the server — the app works offline without a DB
  }
})
