// Light, transparent obfuscation of rating values in exported results — not
// meant to resist a determined attacker (who could tamper with their own
// client-side data regardless), only to keep an "honest-but-curious" viewer
// of the raw file from casually reading scores at a glance. The key is
// derived from testId + participantId, both of which stay in plain text in
// the same file, so anyone with the file and this (open-source) algorithm
// can decrypt it — see scripts/decrypt_results.py.

const ALGORITHM = "AES-GCM";
export const KEY_DERIVATION_DESCRIPTION = 'SHA-256("<testId>:<participantId>")';

async function deriveKey(testId, participantId) {
  const material = new TextEncoder().encode(`${testId}:${participantId}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, { name: ALGORITHM }, false, [
    "encrypt",
  ]);
}

function toBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function createEncryptor(testId, participantId) {
  const keyPromise = deriveKey(testId, participantId);

  return async function encryptRating(rating) {
    const key = await keyPromise;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(String(rating));
    const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, data);
    return {
      rating: toBase64(new Uint8Array(ciphertext)),
      iv: toBase64(iv),
    };
  };
}
