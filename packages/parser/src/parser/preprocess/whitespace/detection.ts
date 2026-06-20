export function needsWhitespaceSubstitution(text: string): boolean {
  if (text.length === 0) return false;

  if (text[0] === "\n" || text[0] === " " || text[text.length - 1] === "\n") {
    return true;
  }

  return (
    text.indexOf("\r") !== -1 ||
    text.indexOf("\t") !== -1 ||
    text.indexOf("\0") !== -1 ||
    text.indexOf("\u00a0") !== -1 ||
    text.indexOf("\u2007") !== -1 ||
    text.indexOf("\\\n") !== -1 ||
    text.indexOf("\n\n\n") !== -1 ||
    text.indexOf("\n ") !== -1
  );
}

export function mayContainWhitespaceOnlyLine(text: string): boolean {
  const first = text[0];
  if (
    first === " " ||
    first === "\t" ||
    first === "\n" ||
    first === "\u00a0" ||
    first === "\u2007"
  ) {
    return true;
  }

  return (
    text.indexOf("\n ") !== -1 ||
    text.indexOf("\n\n") !== -1 ||
    text.indexOf("\n\t") !== -1 ||
    text.indexOf("\n\u00a0") !== -1 ||
    text.indexOf("\n\u2007") !== -1
  );
}
