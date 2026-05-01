import pg from 'pg'

const { Pool } = pg

let pool

/**
 * Get or create the PostgreSQL connection pool.
 * Uses DATABASE_URL from runtime config / environment.
 */
export function useDb() {
  if (!pool) {
    const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB } =
      process.env
    if (!POSTGRES_USER || !POSTGRES_HOST || !POSTGRES_DB) {
      throw new Error('Missing required POSTGRES_* environment variables')
    }
    pool = new Pool({
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      host: POSTGRES_HOST,
      port: parseInt(POSTGRES_PORT || '5432', 10),
      database: POSTGRES_DB,
      max: 20,
    })
  }
  return pool
}

/**
 * Run a single query with params.
 */
export async function query(text, params) {
  const db = useDb()
  return db.query(text, params)
}
