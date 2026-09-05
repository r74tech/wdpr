import type { Element } from "@wdprlib/ast";
import { createToken, type Token } from "../../../../lexer";
import { processDepths, type DepthList } from "../../../depth";
import type { ParseContext } from "../../types";
import { parseBlocksUntil } from "../utils";
import type { BlockquoteLine, ParsedBlockquoteLine } from "./lines";

/**
 * Blocks Wikidot protects before parsing, by matching an opening tag at the
 * start of a line. A `>` prefix defeats that match, so inside a blockquote
 * only their tags stay literal while the body parses as usual.
 */
const EXCLUDED_BLOCK_NAMES: ReadonlySet<string> = new Set([
  "bibliography",
  "code",
  "html",
  "include",
  "math",
  "module",
  "module-backlinks",
  "module-categories",
  "module-css",
  "module-join",
  "module-listpages",
  "module-listusers",
  "module-page-tree",
  "module-rate",
  "module-tagcloud",
]);

const END_OF_CONTENT = () => false;

export function buildBlockquoteElements(
  ctx: ParseContext,
  lines: ParsedBlockquoteLine[],
): Element[] {
  const depthTrees = processDepths<null, BlockquoteLine>(null, lines);
  return depthTrees
    .map(({ list }) => buildBlockquoteElement(ctx, list))
    .filter((element): element is Element => element !== null);
}

function buildBlockquoteElement(
  ctx: ParseContext,
  list: DepthList<null, BlockquoteLine>,
): Element | null {
  const children: Element[] = [];
  let pending: BlockquoteLine[] = [];

  function flushPending() {
    if (pending.length === 0) return;
    children.push(...parseLines(ctx, pending));
    pending = [];
  }

  for (const item of list) {
    if (item.kind === "item") {
      pending.push(item.value);
      continue;
    }

    flushPending();
    const nested = buildBlockquoteElement(ctx, item.children);
    if (nested) {
      children.push(nested);
    }
  }

  flushPending();

  if (children.length === 0) {
    return null;
  }

  return {
    element: "container",
    data: {
      type: "blockquote",
      attributes: {},
      elements: children,
    },
  };
}

function parseLines(ctx: ParseContext, lines: BlockquoteLine[]): Element[] {
  const tokens = sliceLineTokens(ctx, lines);
  const lineCtx: ParseContext = { ...ctx, tokens, pos: 0 };

  return parseBlocksUntil(lineCtx, END_OF_CONTENT, {
    excludedBlockNames: EXCLUDED_BLOCK_NAMES,
  }).elements;
}

function sliceLineTokens(ctx: ParseContext, lines: BlockquoteLine[]): Token[] {
  const tokens: Token[] = [];

  for (const { start, end } of lines) {
    for (let pos = start; pos < end; pos++) {
      const token = ctx.tokens[pos];
      if (token) {
        tokens.push(token);
      }
    }
  }

  const last = tokens[tokens.length - 1];
  tokens.push(createToken("EOF", "", last?.position ?? ZERO_POSITION));

  return tokens;
}

const ZERO_POSITION = {
  start: { line: 0, column: 0, offset: 0 },
  end: { line: 0, column: 0, offset: 0 },
};
