/**
 *
 * Text-level expansion of `[[#if ...]]`, `[[#ifexpr ...]]`, and
 * `[[#expr ...]]` directives that sit *inside* another block's opener.
 *
 * The inline rules in `rules/inline/expr.ts` parse these forms as regular
 * inline elements, but that only works when the directive appears in
 * parseable inline text. When one is embedded inside a block opener's
 * attribute string, e.g.
 *
 * ```wikitext
 * [[div class="x [[#if 1 | a | b ]]"]]
 * [[li class="[[#if 1 | folded | unfolded ]] [[#ifexpr 1>0 | hot | cold ]]"]]
 * [[div col="[[#expr 1+1]]"]]
 * ```
 *
 * the lexer cannot recover a well-formed opener from the input. The
 * embedded directive has to collapse to a plain string before the parser
 * sees the outer tag.
 *
 * This pass only resolves directives whose `[[#` sits inside an unclosed
 * `[[` (depth > 0). Top-level directives are left untouched so the inline
 * parser / AST renderer keeps its full evaluator + element support.
 *
 * Truthiness rules match the inline `ifRule` / `ifExprRule`: an empty
 * string, `"0"`, `"false"`, `"null"` (case-insensitive) are falsy.
 *
 * @module
 */

import { evaluateExpression, formatExprValue, isTruthy } from "@wdprlib/ast";
import {
  computeBracketDepths,
  makeUniqueSentinels,
  maskRawRegions,
  restorePlaceholders,
} from "./utils";

/**
 * Resolve every `[[#if]]` / `[[#ifexpr]]` / `[[#expr]]` that sits inside
 * another block's opener (depth > 0). Top-level directives are left for
 * the inline parser. Innermost-first reduction lets an outer directive
 * re-process the flattened body on the next pass. Unmatched / malformed
 * directives are left untouched.
 */
export function preprocessExpr(source: string): string {
  if (!source.includes("[[#")) return source;

  const sentinels = makeUniqueSentinels(source);
  const { masked, placeholders } = maskRawRegions(source, sentinels);
  const reduced = reduceExpr(masked);
  return restorePlaceholders(reduced, placeholders, sentinels);
}

/**
 * Backwards-compatible alias for the older `preprocessIf` name (used by
 * external callers that target the previous, `[[#if]]`-only behaviour).
 * Both names point at the same implementation, which now also resolves
 * `[[#ifexpr]]` and `[[#expr]]` in opener context.
 */
export const preprocessIf: (source: string) => string = preprocessExpr;

function reduceExpr(source: string): string {
  let current = source;
  const maxIterations = source.length + 1;
  for (let i = 0; i < maxIterations; i++) {
    const next = expandInnermost(current);
    if (next === current) return current;
    current = next;
  }
  return current;
}

/**
 * Walk `source`, locate every innermost `[[#if]]` / `[[#ifexpr]]` /
 * `[[#expr]]` directive that sits inside an unclosed `[[`, and replace
 * it with its evaluated string. Returns the source unchanged when no
 * replacements were made.
 */
function expandInnermost(source: string): string {
  const depths = computeBracketDepths(source);
  let result = "";
  let i = 0;
  let replaced = false;

  while (i < source.length) {
    const kind = matchDirectiveKind(source, i);
    if (kind !== null && depths[i]! > 0) {
      const match = tryParseInnermostDirective(source, i, kind);
      if (match !== null) {
        result += evaluateDirective(kind, match);
        i = match.end;
        replaced = true;
        continue;
      }
    }
    result += source[i];
    i++;
  }

  return replaced ? result : source;
}

type DirectiveKind = "if" | "ifexpr" | "expr";

/** Return the kind of `[[#xxx` directive at `i`, or null if none matches. */
function matchDirectiveKind(source: string, i: number): DirectiveKind | null {
  if (!source.startsWith("[[#", i)) return null;
  // Order matters: `ifexpr` must be checked before `if` because the
  // shorter `if` prefix would otherwise consume `ifexpr` openings.
  if (source.startsWith("ifexpr", i + 3) && !isIdentChar(source[i + 9])) {
    return "ifexpr";
  }
  if (source.startsWith("if", i + 3) && !isIdentChar(source[i + 5])) {
    return "if";
  }
  if (source.startsWith("expr", i + 3) && !isIdentChar(source[i + 7])) {
    return "expr";
  }
  return null;
}

interface DirectiveMatch {
  /** Position just past the closing `]]`. */
  end: number;
  /** Raw condition / expression (everything between the keyword and the first top-level `|` or `]]`). */
  head: string;
  /** Raw `then` branch (empty when no `|` appeared). */
  thenText: string;
  /** Raw `else` branch (empty when only one `|` appeared). */
  elseText: string;
  /** Whether the directive supplied a `|` at all. */
  hasPipe: boolean;
}

/**
 * Try to parse a single `[[#kind ...]]` directive starting at `start`.
 * Returns `null` when the directive is malformed (no closing `]]`) or
 * when its body contains another `[[#kind]]` of the same family
 * (so the caller should keep descending). The substrings are returned
 * raw; callers decide how to evaluate them.
 */
function tryParseInnermostDirective(
  source: string,
  start: number,
  kind: DirectiveKind,
): DirectiveMatch | null {
  const keywordLen = kind === "ifexpr" ? 6 : kind === "expr" ? 4 : 2;
  // start + 3 ("[[#") + keywordLen → first char after the keyword.
  let pos = start + 3 + keywordLen;
  // The inline rule does not require a whitespace separator here — it
  // accepts e.g. `[[#expr(1+1)]]` and `[[#ifexpr(1)|yes|no]]`. Skip any
  // optional leading whitespace and let the body scan handle the rest.
  while (pos < source.length && isWhitespace(source[pos])) pos++;

  const headStart = pos;
  let blockDepth = 0;
  let linkDepth = 0;
  const pipes: number[] = [];
  let closeStart = -1;

  while (pos < source.length) {
    // Reject any nested directive of the same family so we resolve
    // innermost-first.
    if (matchDirectiveKind(source, pos) !== null) {
      return null;
    }
    if (source.startsWith("[[[", pos)) {
      linkDepth++;
      pos += 3;
      continue;
    }
    if (linkDepth > 0 && source.startsWith("]]]", pos)) {
      linkDepth--;
      pos += 3;
      continue;
    }
    if (linkDepth > 0) {
      pos++;
      continue;
    }
    if (source.startsWith("[[", pos)) {
      blockDepth++;
      pos += 2;
      continue;
    }
    if (source.startsWith("]]", pos)) {
      if (blockDepth === 0) {
        closeStart = pos;
        break;
      }
      blockDepth--;
      pos += 2;
      continue;
    }
    if (source[pos] === "|" && blockDepth === 0 && linkDepth === 0) {
      pipes.push(pos);
    }
    pos++;
  }

  if (closeStart === -1) return null;
  const hasPipe = pipes.length > 0;
  // `[[#if]]` / `[[#ifexpr]]` require a `then` branch separated by `|`.
  // A directive without a pipe is malformed; leave it for the inline
  // parser to report rather than silently dropping it.
  if (!hasPipe && (kind === "if" || kind === "ifexpr")) return null;

  let head: string;
  let thenText = "";
  let elseText = "";

  if (!hasPipe) {
    head = source.slice(headStart, closeStart).trim();
  } else {
    head = source.slice(headStart, pipes[0]!).trim();
    if (pipes.length >= 2) {
      thenText = source.slice(pipes[0]! + 1, pipes[1]!).trim();
      elseText = source.slice(pipes[1]! + 1, closeStart).trim();
    } else {
      thenText = source.slice(pipes[0]! + 1, closeStart).trim();
    }
  }

  return {
    end: closeStart + 2,
    head,
    thenText,
    elseText,
    hasPipe,
  };
}

/** Evaluate a parsed directive into its replacement string. */
function evaluateDirective(kind: DirectiveKind, m: DirectiveMatch): string {
  if (kind === "expr") {
    const result = evaluateExpression(m.head);
    if (result.success) return formatExprValue(result.value);
    // The inline renderer emits nothing for an empty `[[#expr ]]`; mirror
    // that so an opener-embedded empty expr collapses to an empty
    // attribute value rather than the literal "ERROR" placeholder.
    if (result.error === "empty expression") return "";
    return "ERROR";
  }
  if (kind === "if") {
    if (!m.hasPipe) return "";
    return isTruthy(m.head) ? m.thenText : m.elseText;
  }
  // ifexpr — the inline renderer treats every error (including empty
  // expression) as a "run-time error" string, so we keep the placeholder
  // here to avoid silently swallowing a malformed conditional.
  if (!m.hasPipe) return "";
  const result = evaluateExpression(m.head);
  if (!result.success) return "ERROR";
  return result.value !== 0 && !Number.isNaN(result.value) ? m.thenText : m.elseText;
}

function isWhitespace(ch: string | undefined): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

function isIdentChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[a-z0-9_-]/i.test(ch);
}
