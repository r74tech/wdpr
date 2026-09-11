/** Text_Wiki Email.php described-email grammar; no URI header characters. */
export function isBracketEmail(target: string): boolean {
  return /^[_a-z0-9-]+(?:\.[_a-z0-9-]+)*@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(target);
}

/** Single-bracket Interwiki.php grammar, restricted to the verified Wikipedia mapping. */
export function wikipediaPage(target: string): string | null {
  return /^wikipedia:((?!:)[A-Za-z0-9_/=&~#.:;+-]+)$/.exec(target)?.[1] ?? null;
}
