import type { ModuleCleanup, RuntimeOptions } from "./types";
import { isElement } from "./utils/dom";
import { hideTooltip, showTooltip } from "./utils/tooltip";

let scriptLoaded = false;

/** Load math rendering script if math elements are present */
export function initMath(root: HTMLElement, options?: RuntimeOptions): ModuleCleanup {
  const mathUrl = options?.mathUrl;

  if (mathUrl) {
    const hasMath = root.querySelector(".math-equation, .math-inline") !== null;
    if (hasMath && !scriptLoaded) {
      loadScript(root.ownerDocument, mathUrl);
      scriptLoaded = true;
    }
  }

  function handleMouseEnter(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;
    const link = target.closest<HTMLAnchorElement>("a.eref");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href?.startsWith("#")) return;

    const equation = root.ownerDocument.getElementById(href.slice(1));
    if (!equation) return;

    showTooltip(link, equation);
  }

  function handleMouseLeave(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;
    if (target.closest("a.eref")) {
      hideTooltip();
    }
  }

  root.addEventListener("mouseenter", handleMouseEnter, true);
  root.addEventListener("mouseleave", handleMouseLeave, true);

  return {
    destroy() {
      root.removeEventListener("mouseenter", handleMouseEnter, true);
      root.removeEventListener("mouseleave", handleMouseLeave, true);
    },
  };
}

/**
 * Check if a URL is valid for script loading (http/https only)
 * Prevents javascript:, data:, and other dangerous schemes
 */
function isValidScriptUrl(url: string): boolean {
  try {
    const parsed = new URL(url, globalThis.location?.href);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function loadScript(doc: Document, url: string): void {
  if (!isValidScriptUrl(url)) {
    console.error("[wdparser] Invalid script URL scheme:", url);
    return;
  }
  const script = doc.createElement("script");
  script.src = url;
  script.async = true;
  doc.head.appendChild(script);
}
