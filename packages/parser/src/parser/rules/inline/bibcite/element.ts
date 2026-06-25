import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";

export function buildBibliographyCitation(ctx: ParseContext, label: string): Element {
  ctx.bibcites.push(label);

  return {
    element: "bibliography-cite",
    data: {
      label,
      brackets: false,
    },
  };
}
