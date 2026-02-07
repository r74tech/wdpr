/**
 * @module hash
 *
 * Pure-JavaScript hash functions for generating deterministic element IDs.
 *
 * These functions use FNV-1a internally and produce hex strings whose
 * lengths match SHA-1 (40 chars) and MD5 (32 chars) for compatibility
 * with Wikidot's ID generation patterns. Cryptographic security is not
 * required; the hashes only need to be deterministic and well-distributed.
 *
 * `node:crypto` is intentionally avoided because `bunup`'s ESM build
 * injects `createRequire` from `node:module`, which is incompatible
 * with browser environments.
 */

/**
 * Generate a 40-character hex hash (same length as SHA-1) from the input string.
 *
 * @param input - The string to hash.
 * @returns A 40-character lowercase hex string.
 */
export function syncHashSha1(input: string): string {
  return fnv1aHash(input, 40);
}

/**
 * Generate a 32-character hex hash (same length as MD5) from the input string.
 *
 * @param input - The string to hash.
 * @returns A 32-character lowercase hex string.
 */
export function syncHashMd5(input: string): string {
  return fnv1aHash(input, 32);
}

/**
 * Compute an FNV-1a hash of the given input and return a hex string of
 * the requested length.
 *
 * Because a single FNV-1a pass produces only 32 bits (8 hex chars), the
 * function runs multiple rounds with different initial seeds (XOR of
 * the round index into the offset basis) and concatenates the results
 * to reach the desired length.
 *
 * @param input - The string to hash.
 * @param hexLen - Desired length of the output hex string (e.g. 32 or 40).
 * @returns A lowercase hex string of exactly `hexLen` characters.
 */
function fnv1aHash(input: string, hexLen: number): string {
  let result = "";
  const rounds = Math.ceil(hexLen / 8);
  for (let round = 0; round < rounds; round++) {
    let h = 0x811c9dc5 ^ round;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    result += (h >>> 0).toString(16).padStart(8, "0");
  }
  return result.substring(0, hexLen);
}
