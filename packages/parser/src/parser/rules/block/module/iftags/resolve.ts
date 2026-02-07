/**
 *
 * Resolution of `[[iftags]]` conditional blocks.
 *
 * During the resolve phase, each `[[iftags]]` element is evaluated against
 * the current page's tags. If the condition matches, the element's children
 * are included in the output; otherwise, they are omitted. If page tags are
 * not available (null), the element is kept as-is for later resolution.
 *
 * @module
 */

import type { Element } from "@wdprlib/ast";
import { parseTagCondition, evaluateTagCondition } from "./condition";

/**
 * Data structure for an `[[iftags]]` element in the AST.
 */
export interface IfTagsData {
  condition: string;
  elements: Element[];
}

/**
 * Result of attempting to resolve an `[[iftags]]` element.
 *
 * The `evaluated` flag indicates whether the condition was actually tested.
 * When `pageTags` is null (tags not available), the condition is not evaluated
 * and the element should be kept in the AST for later resolution.
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
 * Type guard to check if an element is an `[[iftags]]` element.
 *
 * @param element - The element to check
 * @returns true if the element has `element: "if-tags"` and appropriate data structure
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
