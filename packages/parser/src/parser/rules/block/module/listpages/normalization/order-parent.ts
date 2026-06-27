import type { NormalizedOrder, NormalizedParent, OrderDirection, OrderField } from "../types";

/**
 * Mapping from Wikidot's order field names to normalized OrderField values.
 */
const ORDER_FIELD_MAP: Record<string, OrderField> = {
  datecreated: "created_at",
  dateedited: "updated_at",
  title: "title",
  fullname: "fullname",
  rating: "rating",
  votes: "votes",
  revisions: "revisions",
  comments: "comments",
  pagelength: "size",
  size: "size",
  random: "random",
  created_at: "created_at",
  updated_at: "updated_at",
};

/**
 * Parse order string into structured format.
 */
export function parseOrder(value: string): NormalizedOrder {
  const defaultOrder: NormalizedOrder = { field: "created_at", direction: "desc" };
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return defaultOrder;

  const spaceParts = trimmed.split(/\s+/);
  if (spaceParts.length >= 2 && spaceParts[0] && spaceParts[1]) {
    const field = ORDER_FIELD_MAP[spaceParts[0]];
    const direction = spaceParts[1] === "asc" ? "asc" : "desc";
    if (field) {
      return { field, direction };
    }
  }

  let direction: OrderDirection = "desc";
  let fieldPart = trimmed;

  if (trimmed.endsWith("desc")) {
    direction = "desc";
    fieldPart = trimmed.slice(0, -4);
  } else if (trimmed.endsWith("asc")) {
    direction = "asc";
    fieldPart = trimmed.slice(0, -3);
  }

  const field = ORDER_FIELD_MAP[fieldPart];
  if (field) {
    return { field, direction };
  }

  const singleField = ORDER_FIELD_MAP[trimmed];
  if (singleField) {
    return { field: singleField, direction: "desc" };
  }

  return defaultOrder;
}

/**
 * Parse parent string into structured format.
 */
export function parseParent(value: string): NormalizedParent | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  switch (trimmed) {
    case "-":
      return { type: "none" };
    case "=":
      return { type: "same" };
    case "-=":
      return { type: "different" };
    case ".":
      return { type: "children" };
    default:
      return { type: "page", name: trimmed };
  }
}
