/**
 * FNV-1a based hash functions for DOM element ID generation.
 * Cryptographic security is not required for this use case.
 * node:crypto (SHA1/MD5) is avoided because bunup's ESM build injects
 * createRequire from "node:module", which is incompatible with browsers.
 */

/** Generate a SHA1-length (40 hex chars) hash */
export function syncHashSha1(input: string): string {
  return fnv1aHash(input, 40);
}

/** Generate an MD5-length (32 hex chars) hash */
export function syncHashMd5(input: string): string {
  return fnv1aHash(input, 32);
}

/** FNV-1a hash producing hex string of specified length */
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
