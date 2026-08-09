const LOCAL_PATH_META_CHARACTERS = /[\\/?#]/;

/** Return whether a value is safe to place into one local URL path segment. */
export function isSafeLocalPathComponent(value: string): boolean {
  if (
    value.length === 0 ||
    value.endsWith(" ") ||
    value.includes("%") ||
    hasAsciiControl(value) ||
    LOCAL_PATH_META_CHARACTERS.test(value)
  ) {
    return false;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }

  return (
    decoded !== "." &&
    decoded !== ".." &&
    !hasAsciiControl(decoded) &&
    !LOCAL_PATH_META_CHARACTERS.test(decoded)
  );
}

export function hasAsciiControl(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/** Validate and join path components without allowing URL parser traversal semantics. */
export function joinSafeLocalPath(components: readonly string[]): string | null {
  return components.every(isSafeLocalPathComponent) ? components.join("/") : null;
}

/** Validate an already slash-separated local path. */
export function normalizeSafeLocalPath(path: string): string | null {
  const withoutLeadingSlash = path.startsWith("/") ? path.slice(1) : path;
  return joinSafeLocalPath(withoutLeadingSlash.split("/"));
}
