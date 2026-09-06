import type { renderMessages } from "./messages.generated";

export { renderMessages } from "./messages.generated";

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

export type RenderMessageDescriptor = {
  [Id in RenderMessageId]: { id: Id; defaultMessage: (typeof renderMessages)[Id] };
}[RenderMessageId];
