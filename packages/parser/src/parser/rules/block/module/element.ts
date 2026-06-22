import type { Element, Module } from "@wdprlib/ast";

export function moduleParseResultToElement(result: Module | Element): Element {
  if (isElement(result)) {
    return result;
  }

  return createModuleElement(result);
}

export function createUnknownModuleElement(
  name: string,
  args: Record<string, string>,
  body: string | undefined,
): Element {
  return createModuleElement({
    module: "unknown",
    name,
    arguments: args,
    body,
  });
}

function createModuleElement(data: Module): Element {
  return {
    element: "module",
    data,
  };
}

function isElement(value: Module | Element): value is Element {
  return "element" in value;
}
