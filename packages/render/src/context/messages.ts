import { IntlMessageFormat, type FormatXMLElementFn } from "intl-messageformat";
import { escapeHtml } from "../escape";
import type { RenderI18n, RenderMessageId, RenderMessageDescriptor } from "../messages";

class Markup {
  constructor(readonly html: string) {}
}

export class RenderMessages {
  private readonly formatters = new Map<RenderMessageId, IntlMessageFormat>();

  constructor(private readonly i18n: RenderI18n | undefined = undefined) {}

  text(message: RenderMessageDescriptor): string {
    if (this.translation(message.id) === undefined) return message.defaultMessage;
    return this.format(message).join("");
  }

  html(
    message: RenderMessageDescriptor,
    values: Record<string, string>,
    tags: Record<string, (html: string) => string>,
  ): string {
    const richValues: Record<string, string | FormatXMLElementFn<Markup>> = { ...values };
    for (const [name, render] of Object.entries(tags)) {
      richValues[name] = (chunks) => new Markup(render(chunks.map(serialize).join("")));
    }
    return this.format(message, richValues).map(serialize).join("");
  }

  private translation(id: RenderMessageId): string | undefined {
    return this.i18n && Object.hasOwn(this.i18n.messages, id) ? this.i18n.messages[id] : undefined;
  }

  private format(
    message: RenderMessageDescriptor,
    values?: Record<string, string | FormatXMLElementFn<Markup>>,
  ): Array<string | Markup> {
    const { id, defaultMessage } = message;
    let formatter = this.formatters.get(id);
    const translation = this.translation(id);
    if (translation !== undefined) {
      try {
        formatter ??= new IntlMessageFormat(translation, this.i18n?.locale);
        this.formatters.set(id, formatter);
        return formatParts(formatter, values);
      } catch (error) {
        this.i18n?.onError?.(error, id);
      }
      return formatParts(new IntlMessageFormat(defaultMessage, "en"), values);
    }
    formatter ??= new IntlMessageFormat(defaultMessage, "en");
    this.formatters.set(id, formatter);
    return formatParts(formatter, values);
  }
}

function formatParts(
  formatter: IntlMessageFormat,
  values?: Record<string, string | FormatXMLElementFn<Markup>>,
): Array<string | Markup> {
  return formatter.formatToParts<Markup>(values).map((part) => {
    assertPart(part.value);
    return part.value;
  });
}

function assertPart(part: unknown): asserts part is string | Markup {
  // ICU accepts a tag callback in a plain argument slot, despite its declared return type.
  if (typeof part !== "string" && !(part instanceof Markup)) {
    throw new TypeError("Message contains a rich tag used as a plain argument");
  }
}

function serialize(part: unknown): string {
  assertPart(part);
  return typeof part === "string" ? escapeHtml(part) : part.html;
}
