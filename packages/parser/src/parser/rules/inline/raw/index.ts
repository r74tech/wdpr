/**
 *
 * Parses the Wikidot raw (verbatim) text syntaxes: `@@...@@` and `@<...>@`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseAngleRaw } from "./angle";
import { parseDoubleAtRaw } from "./double-at";

export const rawRule: InlineRule = {
  name: "raw",
  startTokens: ["RAW_OPEN", "RAW_BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    if (startToken.type === "RAW_BLOCK_OPEN") {
      return parseAngleRaw(ctx);
    }

    return parseDoubleAtRaw(ctx);
  },
};
