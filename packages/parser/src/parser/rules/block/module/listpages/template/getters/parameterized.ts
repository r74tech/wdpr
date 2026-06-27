import { formatDate, formatTagsLinked, splitContentSections } from "../format";
import type { VariableGetter } from "./types";

export function createBraceParamGetter(name: string, param: string): VariableGetter | null {
  switch (name) {
    case "content": {
      const idx = Number(param) - 1;
      return (ctx) => {
        if (!ctx.page.content) return "";
        const sections = splitContentSections(ctx.page.content);
        return sections[idx] ?? "";
      };
    }
    case "form_data":
      return (ctx) => ctx.page.formData?.[param] ?? "";
    case "form_raw":
      return (ctx) => ctx.page.formRaw?.[param] ?? "";
    case "form_label":
      return (ctx) => ctx.page.formLabel?.[param] ?? "";
    case "form_hint":
      return (ctx) => ctx.page.formHint?.[param] ?? "";
    default:
      return null;
  }
}

export function createParenParamGetter(name: string, param: string): VariableGetter | null {
  if (name !== "preview") return null;

  const len = Number(param);
  return (ctx) => (ctx.page.content ?? "").slice(0, len);
}

export function createFormattedGetter(name: string, format: string): VariableGetter | null {
  switch (name) {
    case "created_at":
      return (ctx) => formatDate(ctx.page.createdAt, format);
    case "updated_at":
      return (ctx) => formatDate(ctx.page.updatedAt, format);
    case "commented_at":
      return (ctx) => (ctx.page.commentedAt ? formatDate(ctx.page.commentedAt, format) : "");
    default:
      return null;
  }
}

export function createTagsLinkedGetter(
  name: string,
  format: string | undefined,
): VariableGetter | null {
  if (name === "tags_linked") {
    const prefix = format ?? "/system:page-tags/tag/";
    return (ctx) => formatTagsLinked(ctx.page.tags, prefix);
  }
  if (name === "_tags_linked") {
    const prefix = format ?? "/system:page-tags/tag/";
    return (ctx) => formatTagsLinked(ctx.page.hiddenTags, prefix);
  }
  return null;
}
