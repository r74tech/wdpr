import type { Alignment, FloatAlignment, ImageSource } from "@wdprlib/ast";

export function parseImageSource(src: string): ImageSource {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) {
    return { type: "url", data: src };
  }

  const colonIdx = src.indexOf(":");
  const slashIdx = src.indexOf("/");

  if (colonIdx > 0 && slashIdx > colonIdx) {
    const site = src.substring(0, colonIdx);
    const rest = src.substring(colonIdx + 1);
    const lastSlash = rest.lastIndexOf("/");
    const page = rest.substring(0, lastSlash);
    const file = rest.substring(lastSlash + 1);
    return { type: "file3", data: { site, page, file } };
  }

  const slashes = src.split("/").length - 1;
  if (slashes >= 2) {
    const firstSlash = src.indexOf("/");
    const lastSlash = src.lastIndexOf("/");
    const site = src.substring(0, firstSlash);
    const page = src.substring(firstSlash + 1, lastSlash);
    const file = src.substring(lastSlash + 1);
    return { type: "file3", data: { site, page, file } };
  }
  if (slashIdx > 0) {
    const page = src.substring(0, slashIdx);
    const file = src.substring(slashIdx + 1);
    return { type: "file2", data: { page, file } };
  }

  return { type: "file1", data: { file: src } };
}

export function parseAlignment(blockName: string): FloatAlignment | null {
  let align: Alignment = "left";
  let float = false;

  if (blockName === "=image") {
    align = "center";
  } else if (blockName === "<image") {
    align = "left";
  } else if (blockName === ">image") {
    align = "right";
  } else if (blockName === "f<image") {
    align = "left";
    float = true;
  } else if (blockName === "f>image") {
    align = "right";
    float = true;
  } else if (blockName === "f=image") {
    align = "center";
    float = true;
  } else if (blockName === "image") {
    return null;
  }

  return { align, float };
}
