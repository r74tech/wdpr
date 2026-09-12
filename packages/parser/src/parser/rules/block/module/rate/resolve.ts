import type { Element, RatingRef, RatingState, SyntaxTree } from "@wdprlib/ast";
import { getModuleParseAst, type ModuleParseResult } from "../types";
import { mapElementChildren } from "../walk";
import type { RatingsFetcher } from "./types";

function refKey(ref: RatingRef): string {
  return ref.kind === "main" ? "main" : `custom:${ref.axisKey}`;
}

/** Resolve once after includes and module expansion, using only the displayed page. */
export async function resolveRatings(
  ast: SyntaxTree,
  fetchRatings?: RatingsFetcher,
): Promise<SyntaxTree> {
  const refs = new Map<string, RatingRef>();
  mapDocument(ast, (element) => {
    if (isRating(element) && element.data.ref) refs.set(refKey(element.data.ref), element.data.ref);
    return element;
  });
  const states = new Map<string, RatingState>();
  if (fetchRatings && refs.size > 0) {
    for (const state of await fetchRatings([...refs.values()])) {
      const key = refKey(state.ref);
      if (refs.has(key)) states.set(key, state);
    }
  }
  return mapDocument(ast, (element) => {
    if (!isRating(element)) return element;
    const { state: _previous, ...data } = element.data;
    const state = data.ref ? states.get(refKey(data.ref)) : undefined;
    return { ...element, data: state ? { ...data, state } : data };
  });
}

/** Module-generated source cannot declare ratings, including in its footnote side channel. */
export function suppressModuleRatings(result: ModuleParseResult): ModuleParseResult {
  const ast = mapDocument(getModuleParseAst(result), (element) =>
    isRating(element) ? null : element,
  );
  return "ast" in result ? { ...result, ast } : ast;
}

function isRating(element: Element): element is Extract<Element, { element: "module" }> & {
  data: Extract<
    Extract<Element, { element: "module" }>["data"],
    { module: "rate" | "custom-rate" }
  >;
} {
  return (
    element.element === "module" &&
    (element.data.module === "rate" || element.data.module === "custom-rate")
  );
}

function mapDocument(ast: SyntaxTree, transform: (element: Element) => Element | null): SyntaxTree {
  const map = (elements: Element[]): Element[] =>
    elements.flatMap((original) => {
      const element = transform(original);
      if (!element) return [];
      if (element.element === "if") {
        return [
          {
            ...element,
            data: {
              ...element.data,
              // oxlint-disable-next-line unicorn/no-thenable -- public AST branch name
              then: map(element.data.then),
              else: map(element.data.else),
            },
          },
        ];
      }
      if (element.element === "ifexpr") {
        return [
          {
            ...element,
            data: {
              ...element.data,
              // oxlint-disable-next-line unicorn/no-thenable -- public AST branch name
              then: map(element.data.then),
              else: map(element.data.else),
            },
          },
        ];
      }
      if (element.element === "bibliography-block") {
        return [
          {
            ...element,
            data: {
              ...element.data,
              entries: element.data.entries.map((entry) => ({
                ...entry,
                key: map(entry.key),
                value: map(entry.value),
              })),
            },
          },
        ];
      }
      return [mapElementChildren(element, map)];
    });
  return {
    ...ast,
    elements: map(ast.elements),
    ...(ast.footnotes ? { footnotes: ast.footnotes.map(map) } : {}),
  };
}
