/**
 * Check if `[[#` is followed by an invalid anchor name that closes with `]]`.
 *
 * Valid anchor names match `[-_A-Za-z0-9.%]+`; invalid names are decomposed so
 * the parser can handle the inner `[# text]` as a described anchor link.
 */
export function findInvalidAnchorNameEnd(src: string, pos: number): number | null {
  if (src[pos] !== "[" || src[pos + 1] !== "[" || src[pos + 2] !== "#") {
    return null;
  }
  if (src[pos + 3] !== " ") {
    return null;
  }

  let i = pos + 4;
  while (i < src.length && src[i] === " ") {
    i++;
  }

  let foundInvalid = false;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === "\n") {
      return null;
    }
    if (ch === "]" && src[i + 1] === "]") {
      return foundInvalid ? i : null;
    }
    if (!isValidAnchorNameChar(ch.charCodeAt(0))) {
      foundInvalid = true;
    }
    i++;
  }

  return null;
}

function isValidAnchorNameChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 45 ||
    code === 95 ||
    code === 46 ||
    code === 37
  );
}
