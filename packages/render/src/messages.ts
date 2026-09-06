/** English source messages. Keys are stable catalog IDs; values use ICU MessageFormat. */
export const renderMessages = {
  "toc.title": "Table of Contents",
  "toc.fold": "Fold",
  "toc.unfold": "Unfold",
  "footnote.title": "Footnotes",
  "bibliography.title": "Bibliography",
  "user.anonymous": "Anonymous",
  "rate.label": "rating",
  "rate.up": "I like it",
  "rate.down": "I don't like it",
  "rate.cancel": "Cancel my vote",
  "module.join": "Join",
  "collapsible.show": "+ show block",
  "collapsible.hide": "– hide block",
  "gallery.empty": "Sorry, we couldn't find any images attached to this page.",
  "embed.invalid": "Sorry, no match for the embedded content.",
  "include.missing":
    'Included page "{page}" does not exist (<createLink>create it now</createLink>)',
  "module.unknown":
    "[[module <emphasis>{name}</emphasis>]] No such module, please <documentationLink>check available modules</documentationLink> and fix this page.",
} as const;

export type RenderMessageId = keyof typeof renderMessages;

/** Caller-owned, already selected/merged locale catalog. No translations are bundled. */
export interface RenderI18n {
  /** BCP 47 locale used for ICU formatting of supplied messages. */
  locale: string;
  /** Missing IDs fall back to the English source message, formatted with `en`. */
  messages: Readonly<Partial<Record<RenderMessageId, string>>>;
  /** Invalid messages fall back to English. This callback may throw to fail the render. */
  onError?: (error: unknown, id: RenderMessageId) => void;
}
