/**
 * Numori Clips — Dexie (IndexedDB) local database
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SCHEMA DESIGN DECISIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This module is the single source of truth for the local IndexedDB schema.
 * It is intentionally framework-agnostic: no Vue imports, no composable
 * dependencies. Composables import from here — never the other way around.
 *
 * Tables
 * ------
 * • preferences  — Single-row key/value store (key = 'locale'). Holds the
 *                  full preferences object. Using a table lets us participate
 *                  in Dexie transactions and liveQuery reactivity.
 *
 * • appState     — Lightweight key/value pairs for small scalars:
 *                    auth_token, welcome_completed
 *                  Indexed by `key` for O(1) lookups.
 *
 * Adding a new Dexie version / migration
 * ---------------------------------------
 * Dexie handles schema migrations declaratively. To evolve the schema:
 *
 *   1. Bump the version number (e.g. .version(2)).
 *   2. Declare the NEW stores/indexes for that version.
 *   3. Optionally chain .upgrade(tx => { … }) for data transforms.
 *
 * Only declare tables/indexes that CHANGE or are NEW in each version.
 * Dexie carries forward unchanged tables automatically.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import Dexie from 'dexie'

const db = new Dexie('NumoriClipsDB')

// ── Version 1 — initial schema ──────────────────────────────────────────
db.version(1).stores({
  preferences: 'key',
  appState: 'key',
})

// ── Version 2 — clipboard items ─────────────────────────────────────────
// clips table stores every clipboard entry captured by the app.
//
// Indexes:
//   ++id          — auto-incrementing primary key
//   &hash         — unique content hash to prevent duplicates
//   type          — content type for filtering (text, link, image, code, color, emoji, file)
//   favorite      — boolean flag for quick favorites filter
//   createdAt     — timestamp for chronological ordering
//   [type+createdAt] — compound index for type-filtered chronological queries
//
// Non-indexed fields stored on each record:
//   content       — the raw clipboard content (string or data URL for images)
//   preview       — truncated preview text for display
//   title         — auto-generated title (domain for links, filename for files, etc.)
//   meta          — type-specific metadata object (e.g. { language } for code, { hex, rgb } for color)
//   syncStatus    — 'local' | 'synced' | 'pending' — for future cloud sync
//   updatedAt     — last modification timestamp
db.version(2).stores({
  clips: '++id, &hash, type, favorite, createdAt, [type+createdAt]',
})

export default db
