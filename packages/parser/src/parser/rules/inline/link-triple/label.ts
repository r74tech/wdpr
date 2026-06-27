import type { LinkLabel } from "@wdprlib/ast";

export function buildTripleLinkLabel(args: {
  foundPipe: boolean;
  labelText: string;
  finalTarget: string;
  originalTarget: string;
}): LinkLabel {
  return {
    text: getTripleLinkDisplayText(args),
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
