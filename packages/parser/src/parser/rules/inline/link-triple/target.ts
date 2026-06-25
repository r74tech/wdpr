import type { LinkLocation, LinkType } from "@wdprlib/ast";
import { isInterwikiTarget } from "./interwiki";

export interface TripleLinkTarget {
  target: string;
  hasStar: boolean;
}

export function normalizeTripleLinkTarget(trimmedTarget: string): TripleLinkTarget {
  if (trimmedTarget.startsWith("*")) {
    return { target: trimmedTarget.slice(1), hasStar: true };
  }
  return { target: trimmedTarget, hasStar: false };
}

export function isInvalidTripleLinkTarget(trimmedTarget: string, foundPipe: boolean): boolean {
  return (trimmedTarget === "" && foundPipe) || /#{2,}/.test(trimmedTarget);
}

export function determineLinkTypeAndLocation(target: string): {
  linkType: LinkType;
  link: LinkLocation;
} {
  if (target.startsWith("#")) {
    return { linkType: "anchor", link: target };
  }
  if (target.startsWith("http://") || target.startsWith("https://")) {
    return { linkType: "direct", link: target };
  }

  if (isInterwikiTarget(target)) {
    return { linkType: "interwiki", link: target };
  }

  return { linkType: "page", link: { site: null, page: target } };
}
