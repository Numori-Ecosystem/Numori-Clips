/**
 * Integration tests for the E2E encryption flow.
 *
 * Simulates the complete lifecycle:
 *   1. User registers → derives authKey + encKey
 *   2. Data is encrypted before sync, decrypted after pull
 *   3. Shared data uses independent share keys
 *   4. Password change re-encrypts data
 */
import { describe, it, expect } from 'vitest'
import {
  deriveAuthKey,
  deriveEncKey,
  deriveShareKey,
  generateSharePassword,
  encrypt,
  decrypt,
  isEncrypted,
} from '../crypto.js'

describe('full E2E encryption lifecycle', () => {
  const password = 'MySecureP@ssw0rd!'

  it('registration: derives independent authKey and encKey', async () => {
    const authKey = await deriveAuthKey(password)
    const encKey = await deriveEncKey(password)

    // authKey is a hex string suitable for sending to server
    expect(authKey).toMatch(/^[0-9a-f]{64}$/)

    // encKey is a CryptoKey that can encrypt/decrypt
    const ct = await encrypt('test', encKey)
    const pt = await decrypt(ct, encKey)
    expect(pt).toBe('test')
  })

  it('sync push: encrypts data before sending to server', async () => {
    const encKey = await deriveEncKey(password)

    const data = 'Sensitive content that should be encrypted'
    const encrypted = await encrypt(data, encKey)

    expect(isEncrypted(encrypted)).toBe(true)
    expect(encrypted).not.toContain('Sensitive')
  })

  it('sync pull: decrypts data received from server', async () => {
    const encKey = await deriveEncKey(password)

    const original = 'classified information'
    const encrypted = await encrypt(original, encKey)
    const decrypted = await decrypt(encrypted, encKey)

    expect(decrypted).toBe(original)
  })

  it('password change: re-encrypts data from old key to new key', async () => {
    const oldPassword = 'OldP@ss123'
    const newPassword = 'NewP@ss456'

    const oldEncKey = await deriveEncKey(oldPassword)
    const newEncKey = await deriveEncKey(newPassword)

    // Data encrypted with old key
    const data = ['content 1', 'content 2']
    const encryptedOld = await Promise.all(data.map((d) => encrypt(d, oldEncKey)))

    // Re-encryption process
    const reEncrypted = []
    for (const enc of encryptedOld) {
      const plain = await decrypt(enc, oldEncKey)
      reEncrypted.push(await encrypt(plain, newEncKey))
    }

    // Old key cannot decrypt re-encrypted data
    for (const enc of reEncrypted) {
      await expect(decrypt(enc, oldEncKey)).rejects.toThrow()
    }

    // New key can decrypt
    const dec1 = await decrypt(reEncrypted[0], newEncKey)
    const dec2 = await decrypt(reEncrypted[1], newEncKey)
    expect(dec1).toBe('content 1')
    expect(dec2).toBe('content 2')
  })

  it('shared data: password-protected flow', async () => {
    const sharePassword = 'share-secret-123'

    // Sender encrypts
    const senderKey = await deriveShareKey(sharePassword)
    const data = 'confidential data'
    const encrypted = await encrypt(data, senderKey)

    expect(isEncrypted(encrypted)).toBe(true)

    // Recipient derives key from same password (shared out-of-band)
    const recipientKey = await deriveShareKey(sharePassword)
    const decrypted = await decrypt(encrypted, recipientKey)

    expect(decrypted).toBe('confidential data')
  })

  it('shared data: passwordless flow (random key in URL)', async () => {
    const randomPassword = generateSharePassword()
    expect(randomPassword.length).toBeGreaterThan(0)

    const senderKey = await deriveShareKey(randomPassword)
    const encrypted = await encrypt('some content', senderKey)

    // Recipient extracts password from URL and derives the same key
    const recipientKey = await deriveShareKey(randomPassword)
    const decrypted = await decrypt(encrypted, recipientKey)

    expect(decrypted).toBe('some content')
  })

  it('shared data: wrong password cannot decrypt', async () => {
    const senderKey = await deriveShareKey('correct-password')
    const encrypted = await encrypt('data', senderKey)

    const wrongKey = await deriveShareKey('wrong-password')
    await expect(decrypt(encrypted, wrongKey)).rejects.toThrow()
  })

  it('share key is independent from personal encKey', async () => {
    const samePassword = 'same-password'
    const encKey = await deriveEncKey(samePassword)
    const shareKey = await deriveShareKey(samePassword)

    // Encrypt with encKey, cannot decrypt with shareKey
    const encWithPersonal = await encrypt('data', encKey)
    await expect(decrypt(encWithPersonal, shareKey)).rejects.toThrow()

    // Encrypt with shareKey, cannot decrypt with encKey
    const encWithShare = await encrypt('data', shareKey)
    await expect(decrypt(encWithShare, encKey)).rejects.toThrow()
  })

  it('multiple encryptions of same data produce different ciphertexts', async () => {
    const encKey = await deriveEncKey(password)
    const data = 'same content'

    const enc1 = await encrypt(data, encKey)
    const enc2 = await encrypt(data, encKey)

    // Different ciphertexts (random IVs)
    expect(enc1).not.toBe(enc2)

    // But both decrypt to the same plaintext
    expect(await decrypt(enc1, encKey)).toBe(data)
    expect(await decrypt(enc2, encKey)).toBe(data)
  })
})
