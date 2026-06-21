import type { DefinitionListItem, Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBibliographyContent } from "./entry-content";
import { parseBibliographyKey } from "./entry-key";

/**
 * Internal representation of a single bibliography entry parsed from
 * the `: label : content` line(s) inside the bibliography block.
 */
export interface BibliographyEntry {
  /** The identifier used in `((bibcite label))` references. */
  label: string;
  /** Parsed inline elements for the label portion (the key). */
  key: Element[];
  /** Parsed inline elements for the citation text. */
  content: Element[];
}

/**
 * Parses one bibliography entry from the token stream.
 */
export function parseBibliographyEntry(
  ctx: ParseContext,
  startPos: number,
): { entry: BibliographyEntry; consumed: number } | null {
  const keyResult = parseBibliographyKey(ctx, startPos);
  if (!keyResult) {
    return null;
  }

  const contentResult = parseBibliographyContent(ctx, startPos + keyResult.consumed);

  return {
    entry: {
      label: keyResult.label,
      key: keyResult.key,
      content: contentResult.content,
    },
    consumed: keyResult.consumed + contentResult.consumed,
  };
}

export function toDefinitionListItems(entries: BibliographyEntry[]): DefinitionListItem[] {
  return entries.map((entry) => ({
    key_string: entry.label,
    key: entry.key,
    value: entry.content,
  }));
}
