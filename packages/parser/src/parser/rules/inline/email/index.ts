import type { Element } from "@wdprlib/ast";
import type { InlineRule } from "../../types";
import { EMAIL_START_TOKENS, getEmailGroup } from "./candidates";

export const emailRule: InlineRule = {
  name: "email",
  startTokens: EMAIL_START_TOKENS,
  parse(ctx) {
    const group = getEmailGroup(ctx.tokens, ctx.pos, ctx.scope.inlineEnd ?? ctx.tokens.length);
    if (!group) return { success: false };
    const elements: Element[] = [];
    let copied = group.start;
    for (const candidate of group.candidates) {
      if (copied < candidate.start)
        elements.push({ element: "text", data: group.source.slice(copied, candidate.start) });
      elements.push(
        ctx.scope.suppressEmailLinks
          ? { element: "text", data: candidate.address }
          : {
              element: "link",
              data: {
                type: "direct",
                link: `mailto:${candidate.address}`,
                label: { text: candidate.address },
                target: null,
                extra: null,
              },
            },
      );
      copied = candidate.end;
    }
    if (copied < group.end)
      elements.push({ element: "text", data: group.source.slice(copied, group.end) });
    return { success: true, elements, consumed: group.endToken - ctx.pos };
  },
};
