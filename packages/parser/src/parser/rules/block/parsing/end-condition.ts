import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";

/**
 * Creates a reusable close-condition function that matches block end tags
 * (`[[/name]]`) for one or more block names.
 *
 * The returned function inspects the tokens at `ctx.pos` and returns both
 * whether a match was found and how many tokens the closing tag occupies
 * (including the optional trailing NEWLINE).
 *
 * @param blockNames - Array of block names to match (e.g. `["div"]`).
 * @returns A function suitable for use as a `closeCondition` argument,
 *          returning `{ matched, consumed }`.
 */
export function createBlockEndCondition(
  blockNames: string[],
): (ctx: ParseContext) => { matched: boolean; consumed: number } {
  return (ctx: ParseContext) => {
    const token = ctx.tokens[ctx.pos];
    if (token?.type !== "BLOCK_END_OPEN") {
      return { matched: false, consumed: 0 };
    }

    const nameResult = parseBlockName(ctx, ctx.pos + 1);
    if (!nameResult) {
      return { matched: false, consumed: 0 };
    }

    if (!blockNames.includes(nameResult.name)) {
      return { matched: false, consumed: 0 };
    }

    // Calculate consumed: [[/ + name + ]]
    let consumed = 1 + nameResult.consumed;

    // Check for closing ]]
    const closePos = ctx.pos + 1 + nameResult.consumed;
    if (ctx.tokens[closePos]?.type === "BLOCK_CLOSE") {
      consumed++;
    }

    // Check for trailing newline
    const newlinePos = closePos + 1;
    if (ctx.tokens[newlinePos]?.type === "NEWLINE") {
      consumed++;
    }

    return { matched: true, consumed };
  };
}
