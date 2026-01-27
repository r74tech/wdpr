/** Check if an EventTarget is an Element (works across realms/happy-dom) */
export function isElement(target: EventTarget | null): target is Element {
  return target !== null && "nodeType" in target && (target as Node).nodeType === 1;
}
