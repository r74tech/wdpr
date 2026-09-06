import type { Element } from "@wdprlib/ast";
import type { ParseContext, RuleResult } from "../../types";
import { parseDelimitedContainer } from "../formatting/container";

export function parseStrikethroughContent(ctx: ParseContext): RuleResult<Element> {
  return parseDelimitedContainer(ctx, "STRIKE_MARKER", "strikethrough");
}
