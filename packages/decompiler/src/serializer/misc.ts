import { STYLE_ANCHOR_PREFIX } from "@wdprlib/ast";
import type {
  ColorData,
  ClearFloat,
  Embed,
  IframeData,
  AnchorData,
  EmbedBlockData,
  BibliographyCiteData,
  BibliographyBlockData,
} from "@wdprlib/ast";
import type { SerializeContext } from "./context";
import {
  formatDirectiveAttributes,
  hasBlockCloseCandidate,
  isSafeBareToken,
  isSafeBracketValue,
  isSafeColorValue,
  isSafeParenthesizedValue,
} from "./directive-safety";
import { serializeElements } from "./serialize-element";

/** Serialize a color element to `##color|text##` syntax. */
export function serializeColor(ctx: SerializeContext, data: ColorData): void {
  // Syntax: ##color|text## — color is the raw value (e.g. "c00", "#fff", "blue", "rgb(1,2,3)")
  if (!isSafeColorValue(data.color)) {
    serializeElements(ctx, data.elements);
    return;
  }
  ctx.push(`##${data.color}|`);
  serializeElements(ctx, data.elements);
  ctx.push("##");
}

/** Serialize a clear-float element to `~~~~`, `~~~~<`, or `~~~~>` syntax. */
export function serializeClearFloat(ctx: SerializeContext, data: ClearFloat): void {
  switch (data) {
    case "left":
      ctx.pushBlockLine("~~~~<");
      break;
    case "right":
      ctx.pushBlockLine("~~~~>");
      break;
    case "both":
      // ~~~~ (four tildes) is the canonical form for clear float both
      ctx.pushBlockLine("~~~~");
      break;
  }
  ctx.requestBlankLine();
}

/** Serialize an embed element to `[[embedvideo ...]]` syntax. */
export function serializeEmbed(ctx: SerializeContext, data: Embed): void {
  const tokens = Object.values(data.data);
  if (!tokens.every(isSafeBareToken)) return;

  switch (data.embed) {
    case "youtube":
      ctx.pushBlockLine(`[[embedvideo youtube ${data.data["video-id"]}]]`);
      break;
    case "vimeo":
      ctx.pushBlockLine(`[[embedvideo vimeo ${data.data["video-id"]}]]`);
      break;
    case "github-gist":
      ctx.pushBlockLine(`[[embedvideo github-gist ${data.data.username} ${data.data.hash}]]`);
      break;
    case "gitlab-snippet":
      ctx.pushBlockLine(`[[embedvideo gitlab-snippet ${data.data["snippet-id"]}]]`);
      break;
  }
  ctx.requestBlankLine();
}

/** Serialize an embed-block element to `[[embed]]...[[/embed]]` syntax. */
export function serializeEmbedBlock(
  ctx: SerializeContext,
  data: EmbedBlockData,
  followedByText = false,
): void {
  if (hasBlockCloseCandidate(data.contents, ["embed", "embedvideo", "embedaudio"])) return;
  ctx.pushBlockLine("[[embed]]");
  ctx.push(data.contents);
  if (!data.contents.endsWith("\n")) {
    ctx.push(ctx.newline);
  }
  if (followedByText) ctx.push("[[/embed]]");
  else {
    ctx.pushBlockLine("[[/embed]]");
    ctx.requestBlankLine();
  }
}

/** Serialize an iframe element to `[[iframe url attrs]]` syntax. */
export function serializeIframe(ctx: SerializeContext, data: IframeData): void {
  if (!isSafeBareToken(data.url)) return;
  const attrStr = formatDirectiveAttributes(data.attributes);
  ctx.pushBlockLine(`[[iframe ${data.url}${attrStr}]]`);
  ctx.requestBlankLine();
}

/** Serialize a style element to `[[module CSS]]...[[/module]]` syntax. */
export function serializeStyle(ctx: SerializeContext, data: string): void {
  if (
    data.startsWith(STYLE_ANCHOR_PREFIX) ||
    hasBlockCloseCandidate(data, ["module", "module654"])
  ) {
    return;
  }

  ctx.pushBlockLine("[[module CSS]]");
  ctx.push(data);
  if (!data.endsWith("\n")) {
    ctx.push(ctx.newline);
  }
  ctx.pushBlockLine("[[/module]]");
  ctx.requestBlankLine();
}

/**
 * Serialize an anchor element to `[[a attrs]]content[[/a]]` syntax.
 *
 * The `u-` prefix on id attributes is stripped (Wikidot adds it during rendering).
 */
export function serializeAnchor(ctx: SerializeContext, data: AnchorData): void {
  const attrStr = formatDirectiveAttributes(data.attributes, {
    stripGeneratedIdPrefix: true,
  });
  ctx.push(`[[a${attrStr}]]`);
  serializeElements(ctx, data.elements);
  ctx.push("[[/a]]");
}

/** Serialize a bibliography cite element to `((bibcite label))` syntax. */
export function serializeBibliographyCite(ctx: SerializeContext, data: BibliographyCiteData): void {
  if (!isSafeParenthesizedValue(data.label)) return;
  ctx.push(`((bibcite ${data.label}))`);
}

/** Serialize a bibliography block to `[[bibliography]]...[[/bibliography]]` syntax. */
export function serializeBibliographyBlock(
  ctx: SerializeContext,
  data: BibliographyBlockData,
): void {
  ctx.flushPendingBlankLine();
  ctx.pushBlockLine("[[bibliography]]");
  for (const entry of data.entries) {
    ctx.push(": ");
    serializeElements(ctx, entry.key);
    ctx.push(" : ");
    serializeElements(ctx, entry.value);
    ctx.push(ctx.newline);
  }
  ctx.pushBlockLine("[[/bibliography]]");
  ctx.requestBlankLine();
}

/** Serialize an equation reference to `[[eref name]]` syntax. */
export function serializeEquationRef(ctx: SerializeContext, name: string): void {
  if (!isSafeBracketValue(name)) return;
  ctx.push(`[[eref ${name}]]`);
}
