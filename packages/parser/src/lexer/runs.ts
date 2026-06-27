const MIN_PLAIN_TEXT_RUN_LENGTH = 32;

export function findWhitespaceRunEnd(src: string, pos: number): number {
  let end = pos + 1;
  while (end < src.length && (src[end] === " " || src[end] === "\t")) {
    end++;
  }
  return end;
}

export function findRepeatedCharRunEnd(src: string, pos: number, char: string): number {
  let end = pos + 1;
  while (end < src.length && src[end] === char) {
    end++;
  }
  return end;
}

export function findLongPlainTextRunEnd(src: string, pos: number): number | null {
  let end = pos;
  while (end < src.length) {
    const code = src.charCodeAt(end);
    if (code <= 0x7f || code === 0xe000) {
      break;
    }
    end++;
  }

  return end - pos >= MIN_PLAIN_TEXT_RUN_LENGTH ? end : null;
}

export function findAsciiIdentifierEnd(src: string, pos: number): number {
  let end = pos + 1;
  while (end < src.length && isAsciiAlphanumericCode(src.charCodeAt(end))) {
    end++;
  }
  return end;
}

export function isAsciiAlphanumericCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

export function findCompactPlainTextRunEnd(src: string, pos: number): number {
  let end = pos;
  while (end < src.length) {
    const code = src.charCodeAt(end);
    if (isCompactPlainTextBoundary(code)) {
      break;
    }
    end++;
  }
  return end;
}

function isCompactPlainTextBoundary(code: number): boolean {
  switch (code) {
    case 0x0a: // \n
    case 0xe000: // preprocessed backslash break marker
    case 0x5b: // [
    case 0x5d: // ]
    case 0x40: // @
    case 0x3e: // >
    case 0x2d: // -
    case 0x7e: // ~
    case 0x7c: // |
    case 0x7b: // {
    case 0x7d: // }
    case 0x2a: // *
    case 0x3c: // <
    case 0x5f: // _
    case 0x5e: // ^
    case 0x2c: // ,
    case 0x2f: // /
    case 0x2b: // +
    case 0x23: // #
    case 0x3d: // =
    case 0x3a: // :
    case 0x26: // &
    case 0x5c: // \
      return true;
    default:
      return false;
  }
}
