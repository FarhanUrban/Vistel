import type { EncryptedEnvelope } from '@/types'

const RSA_PARAMS: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

export async function generateCountryKeyPair(): Promise<{
  publicKeyJwk: JsonWebKey
  privateKeyJwk: JsonWebKey
}> {
  const pair = await crypto.subtle.generateKey(RSA_PARAMS, true, ['encrypt', 'decrypt'])
  const [publicKeyJwk, privateKeyJwk] = await Promise.all([
    crypto.subtle.exportKey('jwk', pair.publicKey),
    crypto.subtle.exportKey('jwk', pair.privateKey),
  ])
  return { publicKeyJwk, privateKeyJwk }
}

async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, RSA_PARAMS, false, ['encrypt'])
}

async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, RSA_PARAMS, false, ['decrypt'])
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function encryptPayload(
  publicKeyJwk: JsonWebKey,
  data: unknown,
  meta?: { orgId?: string; keyId?: string },
): Promise<EncryptedEnvelope> {
  const publicKey = await importPublicKey(publicKeyJwk)
  const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext)
  const rawAes = await crypto.subtle.exportKey('raw', aesKey)
  const encryptedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAes)

  return {
    version: 1,
    encryptedKey: toBase64(new Uint8Array(encryptedKey)),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    orgId: meta?.orgId,
    keyId: meta?.keyId,
  }
}

export async function decryptPayload<T>(
  privateKeyJwk: JsonWebKey,
  envelope: EncryptedEnvelope,
): Promise<T> {
  const privateKey = await importPrivateKey(privateKeyJwk)
  const rawAes = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    fromBase64(envelope.encryptedKey),
  )
  const aesKey = await crypto.subtle.importKey('raw', rawAes, { name: 'AES-GCM' }, false, [
    'decrypt',
  ])
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(envelope.iv) },
    aesKey,
    fromBase64(envelope.ciphertext),
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

export async function encryptBytes(
  publicKeyJwk: JsonWebKey,
  bytes: ArrayBuffer,
  meta?: { orgId?: string; keyId?: string },
): Promise<EncryptedEnvelope> {
  const publicKey = await importPublicKey(publicKeyJwk)
  const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, bytes)
  const rawAes = await crypto.subtle.exportKey('raw', aesKey)
  const encryptedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAes)

  return {
    version: 1,
    encryptedKey: toBase64(new Uint8Array(encryptedKey)),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    orgId: meta?.orgId,
    keyId: meta?.keyId,
  }
}

export async function decryptBytes(
  privateKeyJwk: JsonWebKey,
  envelope: EncryptedEnvelope,
): Promise<ArrayBuffer> {
  const privateKey = await importPrivateKey(privateKeyJwk)
  const rawAes = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    fromBase64(envelope.encryptedKey),
  )
  const aesKey = await crypto.subtle.importKey('raw', rawAes, { name: 'AES-GCM' }, false, [
    'decrypt',
  ])
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(envelope.iv) },
    aesKey,
    fromBase64(envelope.ciphertext),
  )
}

export function downloadPrivateKeyFile(
  countryIso2: string,
  privateKeyJwk: JsonWebKey,
  meta?: { orgId?: string; keyId?: string },
): void {
  const payload = {
    ...privateKeyJwk,
    ...(meta?.orgId ? { visletOrgId: meta.orgId } : {}),
    ...(meta?.keyId ? { visletKeyId: meta.keyId } : {}),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const suffix = meta?.keyId ? `-${meta.keyId.slice(0, 8)}` : ''
  link.download = `vislet-${countryIso2.toLowerCase()}${suffix}-private-key.json`
  link.click()
  URL.revokeObjectURL(url)
}

/** Structural + cryptographic validation of an RSA-OAEP private JWK. */
export function assertPrivateKeyJwkShape(jwk: unknown): asserts jwk is JsonWebKey {
  if (!jwk || typeof jwk !== 'object') {
    throw new Error('Private key must be a JSON object')
  }
  const key = jwk as JsonWebKey
  if (key.kty !== 'RSA') throw new Error('Private key must be RSA (kty: RSA)')
  if (!key.n || !key.e || !key.d) {
    throw new Error('Private key JSON is missing required fields (n, e, d)')
  }
  if (key.alg && key.alg !== 'RSA-OAEP-256' && key.alg !== 'RSA-OAEP') {
    throw new Error('Private key alg must be RSA-OAEP or RSA-OAEP-256')
  }
}

/**
 * Import private key and optionally verify it decrypts against a registered public key
 * via encrypt/decrypt round-trip.
 */
export async function validatePrivateKeyJwk(
  privateKeyJwk: JsonWebKey,
  publicKeyJwk?: JsonWebKey | null,
): Promise<JsonWebKey> {
  assertPrivateKeyJwkShape(privateKeyJwk)
  // Strip Vislet metadata before WebCrypto import.
  const clean: JsonWebKey = {
    kty: privateKeyJwk.kty,
    n: privateKeyJwk.n,
    e: privateKeyJwk.e,
    d: privateKeyJwk.d,
    p: privateKeyJwk.p,
    q: privateKeyJwk.q,
    dp: privateKeyJwk.dp,
    dq: privateKeyJwk.dq,
    qi: privateKeyJwk.qi,
    alg: 'RSA-OAEP-256',
    ext: true,
    key_ops: ['decrypt'],
  }
  try {
    await importPrivateKey(clean)
  } catch {
    throw new Error('Private key JSON could not be imported by WebCrypto')
  }

  if (publicKeyJwk?.n && publicKeyJwk?.e) {
    if (publicKeyJwk.n !== clean.n || publicKeyJwk.e !== clean.e) {
      throw new Error('Private key does not match the registered agency public key')
    }
    const probe = { t: 'vislet-key-check', n: crypto.randomUUID() }
    const envelope = await encryptPayload(publicKeyJwk, probe)
    const roundTrip = await decryptPayload<typeof probe>(clean, envelope)
    if (roundTrip.t !== probe.t || roundTrip.n !== probe.n) {
      throw new Error('Private key failed encrypt/decrypt round-trip validation')
    }
  }

  return clean
}
