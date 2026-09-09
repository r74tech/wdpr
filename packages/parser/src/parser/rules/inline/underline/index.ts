import type { InlineRule } from "../../types";
import { parseDelimitedContainer } from "../formatting/container";

/** Underline can span ordinary newlines, but cannot cross its enclosing block. */
export const underlineRule: InlineRule = {
  name: "underline",
  startTokens: ["UNDERLINE_MARKER"],
  parse(ctx) {
    return parseDelimitedContainer(ctx, "UNDERLINE_MARKER", "underline", { discardEmpty: true });
  },
};
