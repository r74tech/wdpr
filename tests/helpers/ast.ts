/**
 * AST操作用ヘルパー関数
 */
import type { Element, ContainerData, ListData } from "@wdpr/ast";

export function isContainer(el: Element): el is { element: "container"; data: ContainerData } {
  return el.element === "container";
}

export function getContainerType(el: Element): string | null {
  if (!isContainer(el)) return null;
  const type = el.data.type;
  if (typeof type === "string") return type;
  if (typeof type === "object" && "header" in type) return "heading";
  if (typeof type === "object" && "align" in type) return "align";
  return null;
}

export function getHeadingLevel(el: Element): number | null {
  if (!isContainer(el)) return null;
  const type = el.data.type;
  if (typeof type === "object" && "header" in type) {
    return type.header.level;
  }
  return null;
}

export function getHeadingHidden(el: Element): boolean {
  if (!isContainer(el)) return false;
  const type = el.data.type;
  if (typeof type === "object" && "header" in type) {
    return !type.header["has-toc"];
  }
  return false;
}

export function getChildren(el: Element): Element[] {
  if (isContainer(el)) return el.data.elements;
  return [];
}

export function getTextValue(el: Element): string | null {
  if (el.element === "text") return el.data;
  return null;
}

export function isList(el: Element): el is { element: "list"; data: ListData } {
  return el.element === "list";
}

/**
 * 要素からすべてのテキストを再帰的に取得
 */
export function getAllText(elements: Element[]): string {
  let result = "";
  for (const el of elements) {
    if (el.element === "text") {
      result += el.data as string;
    }
    if ("data" in el && el.data && typeof el.data === "object") {
      const data = el.data as Record<string, unknown>;
      if ("elements" in data && Array.isArray(data.elements)) {
        result += getAllText(data.elements as Element[]);
      }
    }
  }
  return result;
}
