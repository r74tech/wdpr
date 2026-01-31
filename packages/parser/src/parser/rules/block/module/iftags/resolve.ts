/**
 * IfTags resolution
 *
 * Evaluates [[iftags]] conditions and returns matching elements.
 */

import type { Element } from "@wdprlib/ast";
import { parseTagCondition, evaluateTagCondition } from "./condition";

/**
 * IfTags element data structure
 */
export interface IfTagsData {
  condition: string;
  elements: Element[];
}

/**
 * Result of resolving an iftags element
 */
export interface IfTagsResolveResult {
  /**
   * Whether the condition was evaluated
   * - true: condition was evaluated (pageTags provided)
   * - false: pageTags was null, element kept as-is
   */
  evaluated: boolean;

  /**
   * Whether the condition matched (only meaningful if evaluated=true)
   */
  matched: boolean;
}

/**
 * Check if an element is an iftags element
 */
export function isIfTagsElement(
  element: Element,
): element is Element & { element: "if-tags"; data: IfTagsData } {
  return element.element === "if-tags";
}

/**
 * Evaluate an iftags condition against page tags
 *
 * @param data - IfTags element data with condition and child elements
 * @param pageTags - Current page's tags, or null if not available
 * @returns Result indicating if evaluated and if matched
 */
export function resolveIfTags(data: IfTagsData, pageTags: string[] | null): IfTagsResolveResult {
  if (pageTags === null) {
    return { evaluated: false, matched: false };
  }

  const condition = parseTagCondition(data.condition);
  const matched = evaluateTagCondition(condition, pageTags);

  return { evaluated: true, matched };
}
