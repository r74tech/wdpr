/**
 *
 * Text-level removal of `[[html]] ... [[/html]]` blocks when the parser
 * is configured with `allowHtmlBlocks: false`.
 *
 * Wikidot's legacy `Text_Wiki` treats the `Html` rule as a single
 * top-level text-level regex (`lib/Text_Wiki/Text/Wiki.php`,
 * `lib/Text_Wiki/Text/Wiki/Parse/Default/Html.php`). Disabling it means
 * the body should be stripped before the rest of the pipeline can see
 * it — both block-position and mid-paragraph occurrences must be
 * removed, otherwise raw HTML can leak into the rendered output as
 * escaped text. The `htmlBlockRule` gate alone catches only the
 * block-position case because the block dispatcher does not reach an
 * inline `[[html]]`.
 *
 * Behaviour mirrors Wikidot's naive regex: non-greedy match from the
 * first `[[html]]` (with optional attributes) to the next `[[/html]]`,
 * case-insensitive, `.` matches newlines.
 *
 * @module
 */

import type { Diagnostic } from "@wdprlib/ast";

/**
 * Pattern that matches a `[[html ...]]...[[/html]]` block at the text
 * level, using the same non-greedy semantics as Wikidot.
 *
 * Notes on the regex:
 * - `\[\[html` — opener literal, no leading whitespace requirement.
 * - `(?:\s[^\]]*)?` — optional attribute string (everything up to the
 *   first `]` after a whitespace separator).
 * - `\]\]` — opener close.
 * - `[\s\S]*?` — non-greedy body across newlines.
 * - `\[\[\/\s*html\s*\]\]` — close tag, allowing whitespace inside.
 * - `gi` flags: global, case-insensitive (Wikidot block names are
 *   case-insensitive).
 */
const HTML_BLOCK_PATTERN = /\[\[html(?:\s[^\]]*)?\]\][\s\S]*?\[\[\/\s*html\s*\]\]/gi;

/**
 * Convert a character offset in `source` to a 1-indexed line/column
 * pair plus the original offset, matching the parser's `Point` shape.
 */
function offsetToPoint(
  source: string,
  offset: number,
): {
  line: number;
  column: number;
  offset: number;
} {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset; i++) {
    if (source[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1, offset };
}

/**
 * Remove all `[[html]]...[[/html]]` blocks from `source` and record one
 * `html-block-disabled` info diagnostic per match.
 *
 * Unclosed `[[html]]` (no matching `[[/html]]`) is intentionally left
 * in place so the block-rule path can still produce an `unclosed-block`
 * warning alongside `html-block-disabled` when it runs.
 *
 * @param source Wikitext source, pre-tokenisation.
 * @param diagnostics Mutable diagnostic list to which info entries are
 *   appended; positions reference the original source.
 * @returns The source with matched blocks replaced by an empty string.
 */
export function stripDisabledHtmlBlocks(source: string, diagnostics: Diagnostic[]): string {
  // Reset the shared regex's state so repeated calls behave consistently.
  HTML_BLOCK_PATTERN.lastIndex = 0;
  return source.replace(HTML_BLOCK_PATTERN, (match, _offset?: number, _string?: string) => {
    const offset = _offset ?? 0;
    const start = offsetToPoint(source, offset);
    const end = offsetToPoint(source, offset + match.length);
    diagnostics.push({
      severity: "info",
      code: "html-block-disabled",
      message: "[[html]] block ignored: disabled by settings",
      position: { start, end },
    });
    return "";
  });
}
