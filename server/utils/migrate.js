import { query } from './db.js'

/**
 * Database migration — creates tables if they don't exist.
 * Safe to run multiple times (idempotent).
 */
export async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL DEFAULT '',
      avatar_url    TEXT,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Add avatar_url column if missing (for existing databases)
  await query(`
    DO $do$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $do$
  `)

  // Email verification and password recovery
  await query(`
    DO $do$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $do$
  `)

  await query(`
    DO $do$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $do$
  `)

  await query(`
    DO $do$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $do$
  `)

  await query(`
    DO $do$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_purpose TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $do$
  `)

  await query(`
    DO $do$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_recovery_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $do$
  `)

  // Sessions table for multi-device session management
  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash    TEXT NOT NULL,
      device_name   TEXT,
      ip_address    TEXT,
      location      TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)
  `)

  // Add session_duration preference to users (default 7 days in seconds)
  await query(`
    DO $do$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS session_duration INTEGER NOT NULL DEFAULT 604800;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $do$
  `)

  // Add expires_at to sessions for server-side expiry enforcement
  await query(`
    DO $do$ BEGIN
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $do$
  `)

  // App lock settings (JSON) for per-user app lock configuration
  await query(`
    DO $do$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS app_lock_settings JSONB;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $do$
  `)

  // Privacy screen preference (synced across devices, applied on native only)
  await query(`
    DO $do$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_screen_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $do$
  `)

  // Privacy no-tracking flag (default TRUE — privacy on by default)
  await query(`
    DO $do$ BEGIN
      ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_no_tracking BOOLEAN NOT NULL DEFAULT TRUE;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $do$
  `)

  console.warn('[migrate] Database tables ready')
}
