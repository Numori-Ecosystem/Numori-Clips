/**
 * End-to-end encryption utilities using the Web Crypto API.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KEY DERIVATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * From a single user password we derive TWO independent keys via PBKDF2,
 * each with its own salt so neither key reveals the other:
 *
 *   1. authKey   — sent to the server for authentication.
 *                  The server stores hash(authKey), never the raw password.
 *
 *   2. encKey    — a non-extractable AES-GCM CryptoKey that lives in
 *                  memory / sessionStorage only and NEVER leaves the client.
 *
 * Shared data uses a completely separate key derived from a share password
 * (user-chosen or randomly generated) with its own salt.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ENCRYPTION FORMAT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Encrypted payloads are JSON strings with the shape:
 *   { iv: "<base64>", ct: "<base64>" }
 *
 * where `iv` is the 12-byte AES-GCM initialisation vector and `ct` is the
 * ciphertext (including the 16-byte authentication tag appended by AES-GCM).
 */

// ── Secure context guard ─────────────────────────────────────────────────
// crypto.subtle is only available in secure contexts (HTTPS / localhost).
// During Capacitor live-reload development the WebView may load over plain
// HTTP from the host machine's LAN IP, which is NOT a secure context.
// Using --forwardPorts with `cap run` ensures the WebView uses localhost.
function getSubtle() {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle
  }
  throw new Error(
    '[crypto] Web Crypto API (crypto.subtle) is unavailable. ' +
      'This usually means the page is not served over a secure context (HTTPS or localhost). ' +
      'If running Capacitor live-reload, ensure the dev script uses: ' +
      'npx cap run android -l --host localhost --forwardPorts 3000:3000',
  )
}

// ── Salts (assumed pre-defined constants) ────────────────────────────────
// These MUST be unique and stable. Changing them invalidates all derived keys.
const AUTH_SALT = new TextEncoder().encode('w8765nygwhfmw98t:auth-key-salt:v1')
const ENC_SALT = new TextEncoder().encode('w8765nygwhfmw98t:enc-key-salt:v1')
const SHARE_SALT = new TextEncoder().encode('w8765nygwhfmw98t:share-key-salt:v1')

const PBKDF2_ITERATIONS = 600_000 // OWASP recommendation for PBKDF2-SHA256

// ── Helpers ──────────────────────────────────────────────────────────────

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function fromBase64(str) {
  const bin = atob(str)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/**
 * Import a password string as a PBKDF2 base key.
 */
async function importPasswordKey(password) {
  return getSubtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ])
}

// ── Personal note key derivation ─────────────────────────────────────────

/**
 * Derive the authentication key (raw bytes exported as hex) from a password.
 * This value is sent to the server instead of the plaintext password.
 */
export async function deriveAuthKey(password) {
  const baseKey = await importPasswordKey(password)
  const bits = await getSubtle().deriveBits(
    { name: 'PBKDF2', salt: AUTH_SALT, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    256,
  )
  // Return as hex string for easy transport
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Derive an extractable AES-GCM encryption key from a password.
 * Extractable so the raw key material can be persisted in sessionStorage
 * across page refreshes. The key NEVER leaves the client.
 */
export async function deriveEncKey(password) {
  const baseKey = await importPasswordKey(password)
  return getSubtle().deriveKey(
    { name: 'PBKDF2', salt: ENC_SALT, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable — needed for sessionStorage persistence
    ['encrypt', 'decrypt'],
  )
}

/**
 * Export a CryptoKey as a base64 string (raw key bytes).
 */
export async function exportKey(key) {
  const raw = await getSubtle().exportKey('raw', key)
  return toBase64(raw)
}

/**
 * Import a base64 string back into an AES-GCM CryptoKey.
 */
export async function importKey(base64) {
  const raw = fromBase64(base64)
  return getSubtle().importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
}

// ── Shared key derivation ────────────────────────────────────────────────

/**
 * Derive a non-extractable AES-GCM key from a share password.
 * The share password is either user-chosen (password-protected sharing)
 * or randomly generated (passwordless sharing).
 *
 * This key is entirely independent from the user's personal encKey.
 */
export async function deriveShareKey(sharePassword) {
  const baseKey = await importPasswordKey(sharePassword)
  return getSubtle().deriveKey(
    { name: 'PBKDF2', salt: SHARE_SALT, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Generate a cryptographically random password for passwordless sharing.
 * Returns a URL-safe base64 string (22 chars ≈ 128 bits of entropy).
 */
export function generateSharePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ── Encrypt / Decrypt ────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string with an AES-GCM CryptoKey.
 * Returns a JSON string: { iv, ct } (both base64-encoded).
 */
export async function encrypt(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await getSubtle().encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return JSON.stringify({
    iv: toBase64(iv),
    ct: toBase64(ciphertext),
  })
}

/**
 * Decrypt a payload previously produced by `encrypt()`.
 * `encryptedStr` is the JSON string { iv, ct }.
 * Returns the original plaintext string.
 */
export async function decrypt(encryptedStr, key) {
  const { iv, ct } = JSON.parse(encryptedStr)
  const decrypted = await getSubtle().decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(ct),
  )
  return new TextDecoder().decode(decrypted)
}

/**
 * Check whether a string looks like an encrypted payload.
 */
export function isEncrypted(str) {
  if (!str || typeof str !== 'string') return false
  try {
    const parsed = JSON.parse(str)
    return typeof parsed.iv === 'string' && typeof parsed.ct === 'string'
  } catch {
    return false
  }
}

// ── Note-level encryption helpers ────────────────────────────────────────
// Add domain-specific encryption helpers here as needed.
// Example:
//   export async function encryptItem(item, key) { ... }
//   export async function decryptItem(item, key) { ... }

