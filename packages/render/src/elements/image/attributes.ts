import type { ImageSource } from "@wdprlib/ast";
import { getImageAttributes } from "./img-attributes";

export function buildImageTag(
  src: string,
  source: ImageSource,
  attributes: Record<string, string>,
): string {
  return `<img ${getImageAttributes(src, source, attributes).join(" ")} />`;
}
