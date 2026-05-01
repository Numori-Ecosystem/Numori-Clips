/**
 * Unit tests for utils/crypto.js — E2E encryption primitives.
 *
 * Covers: key derivation, encrypt/decrypt round-trips, isEncrypted detection,
 * shared key derivation, key independence, and edge cases.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import {
  deriveAuthKey,
  deriveEncKey,
  deriveShareKey,
  generateSharePassword,
  encrypt,
  decrypt,
  isEncrypted,
} from '../crypto.js'

// ── deriveAuthKey ────────────────────────────────────────────────────────

describe('deriveAuthKey', () => {
  it('returns a 64-char hex string (256 bits)', async () => {
    const key = await deriveAuthKey('testpassword')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic — same password yields same key', async () => {
    const a = await deriveAuthKey('mypassword')
    const b = await deriveAuthKey('mypassword')
    expect(a).toBe(b)
  })

  it('different passwords yield different keys', async () => {
    const a = await deriveAuthKey('password1')
    const b = await deriveAuthKey('password2')
    expect(a).not.toBe(b)
  })
})

// ── deriveEncKey ─────────────────────────────────────────────────────────

describe('deriveEncKey', () => {
  it('returns a CryptoKey with AES-GCM algorithm', async () => {
    const key = await deriveEncKey('testpassword')
    expect(key).toBeInstanceOf(CryptoKey)
    expect(key.algorithm.name).toBe('AES-GCM')
    expect(key.algorithm.length).toBe(256)
  })

  it('key is extractable', async () => {
    const key = await deriveEncKey('testpassword')
    expect(key.extractable).toBe(true)
  })

  it('key supports encrypt and decrypt', async () => {
    const key = await deriveEncKey('testpassword')
    expect(key.usages).toContain('encrypt')
    expect(key.usages).toContain('decrypt')
  })
})

// ── Key independence ─────────────────────────────────────────────────────

describe('key independence', () => {
  it('authKey and encKey are derived from different salts (not equal)', async () => {
    const authKey = await deriveAuthKey('samepassword')
    const encKey = await deriveEncKey('samepassword')
    const encrypted = await encrypt('test', encKey)
    expect(encrypted).not.toContain(authKey)
  })

  it('shareKey is independent from encKey', async () => {
    const encKey = await deriveEncKey('samepassword')
    const shareKey = await deriveShareKey('samepassword')
    const encrypted = await encrypt('secret', encKey)
    await expect(decrypt(encrypted, shareKey)).rejects.toThrow()
  })
})

// ── deriveShareKey ───────────────────────────────────────────────────────

describe('deriveShareKey', () => {
  it('returns a non-extractable AES-GCM CryptoKey', async () => {
    const key = await deriveShareKey('sharepass')
    expect(key).toBeInstanceOf(CryptoKey)
    expect(key.algorithm.name).toBe('AES-GCM')
    expect(key.extractable).toBe(false)
  })

  it('same password yields same key (deterministic)', async () => {
    const k1 = await deriveShareKey('sharepass')
    const k2 = await deriveShareKey('sharepass')
    const ct = await encrypt('hello', k1)
    const pt = await decrypt(ct, k2)
    expect(pt).toBe('hello')
  })

  it('different passwords yield incompatible keys', async () => {
    const k1 = await deriveShareKey('pass1')
    const k2 = await deriveShareKey('pass2')
    const ct = await encrypt('hello', k1)
    await expect(decrypt(ct, k2)).rejects.toThrow()
  })
})

// ── generateSharePassword ────────────────────────────────────────────────

describe('generateSharePassword', () => {
  it('returns a non-empty string', () => {
    const pw = generateSharePassword()
    expect(typeof pw).toBe('string')
    expect(pw.length).toBeGreaterThan(0)
  })

  it('is URL-safe (no +, /, or = characters)', () => {
    for (let i = 0; i < 20; i++) {
      const pw = generateSharePassword()
      expect(pw).not.toMatch(/[+/=]/)
    }
  })

  it('generates unique values', () => {
    const set = new Set()
    for (let i = 0; i < 50; i++) set.add(generateSharePassword())
    expect(set.size).toBe(50)
  })
})

// ── encrypt / decrypt ────────────────────────────────────────────────────

describe('encrypt / decrypt', () => {
  let key

  beforeAll(async () => {
    key = await deriveEncKey('testkey')
  })

  it('round-trips a simple string', async () => {
    const ct = await encrypt('hello world', key)
    const pt = await decrypt(ct, key)
    expect(pt).toBe('hello world')
  })

  it('round-trips an empty string', async () => {
    const ct = await encrypt('', key)
    const pt = await decrypt(ct, key)
    expect(pt).toBe('')
  })

  it('round-trips unicode content', async () => {
    const text = '日本語テスト 🎉 émojis & spëcial chars'
    const ct = await encrypt(text, key)
    const pt = await decrypt(ct, key)
    expect(pt).toBe(text)
  })

  it('round-trips a large string', async () => {
    const text = 'x'.repeat(100_000)
    const ct = await encrypt(text, key)
    const pt = await decrypt(ct, key)
    expect(pt).toBe(text)
  })

  it('encrypted output is a JSON string with iv and ct fields', async () => {
    const ct = await encrypt('test', key)
    const parsed = JSON.parse(ct)
    expect(parsed).toHaveProperty('iv')
    expect(parsed).toHaveProperty('ct')
    expect(typeof parsed.iv).toBe('string')
    expect(typeof parsed.ct).toBe('string')
  })

  it('each encryption produces a different ciphertext (random IV)', async () => {
    const ct1 = await encrypt('same text', key)
    const ct2 = await encrypt('same text', key)
    expect(ct1).not.toBe(ct2)
    expect(await decrypt(ct1, key)).toBe('same text')
    expect(await decrypt(ct2, key)).toBe('same text')
  })

  it('decryption with wrong key throws', async () => {
    const wrongKey = await deriveEncKey('wrongpassword')
    const ct = await encrypt('secret', key)
    await expect(decrypt(ct, wrongKey)).rejects.toThrow()
  })

  it('decryption of tampered ciphertext throws', async () => {
    const ct = await encrypt('secret', key)
    const parsed = JSON.parse(ct)
    const ctBytes = atob(parsed.ct)
    const tampered = String.fromCharCode(ctBytes.charCodeAt(0) ^ 0xff) + ctBytes.slice(1)
    parsed.ct = btoa(tampered)
    await expect(decrypt(JSON.stringify(parsed), key)).rejects.toThrow()
  })
})

// ── isEncrypted ──────────────────────────────────────────────────────────

describe('isEncrypted', () => {
  it('returns true for a valid encrypted payload', async () => {
    const key = await deriveEncKey('test')
    const ct = await encrypt('hello', key)
    expect(isEncrypted(ct)).toBe(true)
  })

  it('returns false for plain text', () => {
    expect(isEncrypted('hello world')).toBe(false)
  })

  it('returns false for a JSON array', () => {
    expect(isEncrypted('["tag1","tag2"]')).toBe(false)
  })

  it('returns false for null / undefined / empty', () => {
    expect(isEncrypted(null)).toBe(false)
    expect(isEncrypted(undefined)).toBe(false)
    expect(isEncrypted('')).toBe(false)
  })

  it('returns false for JSON without iv/ct', () => {
    expect(isEncrypted('{"foo":"bar"}')).toBe(false)
  })

  it('returns true for manually crafted {iv, ct} JSON', () => {
    expect(isEncrypted('{"iv":"abc","ct":"def"}')).toBe(true)
  })
})
