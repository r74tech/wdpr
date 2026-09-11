import type { LinkLabel } from "@wdprlib/ast";

export function buildTripleLinkLabel(args: {
  isPage: boolean;
  foundPipe: boolean;
  labelText: string;
  finalTarget: string;
  originalTarget: string;
}): LinkLabel {
  if (args.isPage && args.foundPipe && !args.labelText.trim()) return "page";
  return {
    text: getTripleLinkDisplayText({
      ...args,
      originalTarget:
        args.isPage && !args.foundPipe ? args.originalTarget.split("#")[0]! : args.originalTarget,
    }),
  };
}

function getTripleLinkDisplayText(args: {
  foundPipe: boolean;
  labelText: string;
  finalTarget: string;
  originalTarget: string;
}): string {
  const trimmedLabel = args.labelText.trim();
  if (args.foundPipe) {
    return trimmedLabel || args.finalTarget;
  }

  const colonIdx = args.originalTarget.indexOf(":");
  if (
    colonIdx !== -1 &&
    !args.originalTarget.startsWith("http") &&
    !args.originalTarget.startsWith("*")
  ) {
    return args.originalTarget.slice(colonIdx + 1).trim();
  }

  return args.originalTarget;
}
