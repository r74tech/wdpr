/**
 * Compute the unmatched-`[[` depth at each character offset of `source`.
 * Mirrors the lexer's `blockOpenerDepth`. Returns `Int32Array` of length
 * `source.length + 1`; `depths[k]` is the depth immediately before the
 * character at offset `k` is consumed.
 */
export function computeBracketDepths(source: string): Int32Array {
  const n = source.length;
  const depths = new Int32Array(n + 1);
  let depth = 0;
  let i = 0;

  while (i < n) {
    depths[i] = depth;
    const c = source.charCodeAt(i);
    const c1 = i + 1 < n ? source.charCodeAt(i + 1) : -1;
    const c2 = i + 2 < n ? source.charCodeAt(i + 2) : -1;

    if (depth > 0 && c === 0x22 /* " */ && precededByEqualsAttr(source, i)) {
      const end = findQuoteEnd(source, i + 1);
      for (let k = i; k <= end; k++) depths[k] = depth;
      i = end + 1;
      continue;
    }

    if (c === 0x5b /* [ */ && c1 === 0x5b && c2 === 0x5b) {
      const end = findTripleLinkEnd(source, i + 3);
      for (let k = i; k <= end; k++) depths[k] = depth;
      i = end + 1;
      continue;
    }

    if (c === 0x5b && c1 === 0x5b) {
      depth++;
      depths[i + 1] = depth;
      i += 2;
      continue;
    }

    if (c === 0x5d /* ] */ && c1 === 0x5d) {
      depth = Math.max(0, depth - 1);
      depths[i + 1] = depth;
      i += 2;
      continue;
    }

    if (c === 0x0a /* \n */) {
      depth = 0;
    }

    i++;
  }

  depths[n] = depth;
  return depths;
}

function precededByEqualsAttr(source: string, pos: number): boolean {
  let j = pos - 1;
  while (j >= 0) {
    const ch = source.charCodeAt(j);
    if (ch === 0x20 /* space */ || ch === 0x09 /* tab */) {
      j--;
      continue;
    }
    return ch === 0x3d; /* = */
  }
  return false;
}

function findQuoteEnd(source: string, from: number): number {
  for (let i = from; i < source.length; i++) {
    const ch = source.charCodeAt(i);
    if (ch === 0x22 /* " */ || ch === 0x0a /* \n */) return i;
  }
  return source.length - 1;
}

function findTripleLinkEnd(source: string, from: number): number {
  for (let i = from; i < source.length; i++) {
    if (
      source.charCodeAt(i) === 0x5d &&
      i + 2 < source.length &&
      source.charCodeAt(i + 1) === 0x5d &&
      source.charCodeAt(i + 2) === 0x5d
    ) {
      return i + 2;
    }
    if (
      source.charCodeAt(i) === 0x0a &&
      i + 1 < source.length &&
      source.charCodeAt(i + 1) === 0x0a
    ) {
      return i;
    }
  }
  return source.length - 1;
}
