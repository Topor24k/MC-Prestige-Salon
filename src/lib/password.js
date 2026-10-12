/*
 * Password hashing for the browser-only account store. Passwords are never kept in
 * plain text: each account stores a random salt and a derived hash.
 *
 * PBKDF2 (Web Crypto) is used wherever the page runs in a secure context — https or
 * localhost. Over plain http (e.g. testing on a phone through a LAN address) Web
 * Crypto is unavailable, so a salted, iterated SHA-256 written in JS takes over.
 * The algorithm used is saved with the account so it can always be verified.
 */

const encoder = new TextEncoder();
const toHex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

const PBKDF2 = 'pbkdf2-sha256';
const FALLBACK = 'sha256-iterated';

export const preferredAlgorithm = () => (globalThis.crypto?.subtle ? PBKDF2 : FALLBACK);

export function randomSalt() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes);
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const rotr = (x, n) => (x >>> n) | (x << (32 - n));

/** SHA-256 of a byte array, returned as bytes. */
export function sha256(bytes) {
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((bytes.length * 8) / 2 ** 32));
  view.setUint32(padded.length - 4, (bytes.length * 8) >>> 0);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let t = 0; t < 16; t += 1) w[t] = view.getUint32(offset + t * 4);
    for (let t = 16; t < 64; t += 1) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t += 1) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  h.forEach((word, i) => outView.setUint32(i * 4, word));
  return out;
}

export async function hashPassword(password, salt, algorithm = preferredAlgorithm()) {
  if (algorithm === PBKDF2) {
    const key = await globalThis.crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await globalThis.crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 150000 },
      key,
      256,
    );
    return toHex(bits);
  }
  let digest = sha256(encoder.encode(`${salt}:${password}`));
  for (let round = 0; round < 3000; round += 1) digest = sha256(digest);
  return toHex(digest);
}

/** Creates the { salt, hash, algorithm } triple stored with a new account. */
export async function createCredential(password) {
  const salt = randomSalt();
  const algorithm = preferredAlgorithm();
  return { salt, algorithm, hash: await hashPassword(password, salt, algorithm) };
}

export async function verifyPassword(password, credential) {
  if (credential.algorithm === PBKDF2 && !globalThis.crypto?.subtle) return false;
  const hash = await hashPassword(password, credential.salt, credential.algorithm);
  return hash === credential.hash;
}
