import type { ImageSource } from "@wdprlib/ast";
import { escapeAttr, sanitizeAttributes } from "../../escape";
import { getFilenameFromSource } from "./source";

export function getImageAttributes(
  src: string,
  source: ImageSource,
  attributes: Record<string, string>,
): string[] {
  const safeAttrs = sanitizeAttributes(attributes);
  const imgAttrs: string[] = [`src="${escapeAttr(src)}"`];

  appendPassedImageAttributes(imgAttrs, safeAttrs);
  imgAttrs.push(`alt="${escapeAttr(safeAttrs.alt ?? getFilenameFromSource(source))}"`);
  imgAttrs.push(`class="${escapeAttr(safeAttrs.class ?? "image")}"`);

  return imgAttrs;
}

function appendPassedImageAttributes(
  imgAttrs: string[],
  safeAttrs: Record<string, string>,
): void {
  for (const key in safeAttrs) {
    if (key === "alt" || key === "class" || key === "src" || key === "srcset") continue;
    const value = safeAttrs[key]!;
    imgAttrs.push(`${key}="${escapeAttr(value)}"`);
  }
}
