import type { Element, CodeBlockData } from "@wdpr/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "../utils";
import { parseAttributesRaw } from "./utils";

export const codeBlockRule: BlockRule = {
  name: "code",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult) {
      return { success: false };
    }

    if (nameResult.name !== "code") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Parse attributes
    const attrResult = parseAttributesRaw(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    // Expect ]]
    let closingSwallowed = false;
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      // Handle unclosed quoted string that swallowed ]]
      // e.g. [[code type="css]][[/code]] → QUOTED_STRING consumed both ]] and [[/code]]
      const prevToken = ctx.tokens[pos - 1];
      if (prevToken?.type === "QUOTED_STRING" && prevToken.value.includes("]]")) {
        const rawValue = prevToken.value;
        const bracketIdx = rawValue.indexOf("]]");
        const truncatedValue = rawValue.startsWith('"')
          ? rawValue.slice(1, bracketIdx)
          : rawValue.slice(0, bracketIdx);
        // Update the attr that was assigned this malformed value
        for (const key of Object.keys(attrResult.attrs)) {
          const stored = attrResult.attrs[key]!;
          if (
            stored === rawValue ||
            stored === rawValue.slice(1, -1) ||
            stored === rawValue.slice(1)
          ) {
            attrResult.attrs[key] = truncatedValue;
            break;
          }
        }
        // If [[/code]] is also inside the quoted string, content is empty
        if (rawValue.includes("[[/code]]")) {
          closingSwallowed = true;
        }
      } else {
        return { success: false };
      }
    } else {
      pos++;
      consumed++;
    }

    // Skip newline after opening tag if present
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    // Collect raw content until [[/code]]
    let codeContent = "";

    while (!closingSwallowed && pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") {
        break;
      }

      // Check for [[/code]]
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult && closeNameResult.name === "code") {
          // Skip [[/code]]
          pos++; // [[/
          consumed++;
          pos += closeNameResult.consumed; // code
          consumed += closeNameResult.consumed;
          // Skip ]]
          if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
            pos++;
            consumed++;
          }
          // Skip trailing newline
          if (ctx.tokens[pos]?.type === "NEWLINE") {
            pos++;
            consumed++;
          }
          break;
        }
      }

      // Collect raw content (don't parse)
      codeContent += token.value;
      pos++;
      consumed++;
    }

    // Trim trailing newline from content
    codeContent = codeContent.replace(/\n$/, "");

    // Store code block in context
    const codeBlockData: CodeBlockData = {
      contents: codeContent,
      language: attrResult.attrs.type ?? null,
      name: attrResult.attrs.name ?? null,
    };
    ctx.codeBlocks.push(codeBlockData);

    return {
      success: true,
      elements: [
        {
          element: "code",
          data: {
            contents: codeContent,
            language: attrResult.attrs.type ?? null,
            name: attrResult.attrs.name ?? null,
          },
        },
      ],
      consumed,
    };
  },
};
