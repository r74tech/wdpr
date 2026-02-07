/**
 *
 * DOM utility functions shared across runtime modules.
 *
 * @module
 */

/**
 * Type guard that checks whether an `EventTarget` is a DOM `Element`.
 *
 * Uses `nodeType === 1` (ELEMENT_NODE) rather than `instanceof Element`
 * so that it works correctly across different realms (e.g. iframes) and
 * in testing environments like happy-dom where the `Element` constructor
 * may differ from the one in the main window.
 *
 * @param target - The event target to check, typically from `event.target`.
 * @returns `true` if the target is a DOM Element.
 */
export function isElement(target: EventTarget | null): target is Element {
  return target !== null && "nodeType" in target && (target as Node).nodeType === 1;
}
