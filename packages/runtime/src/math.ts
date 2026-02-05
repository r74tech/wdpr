import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";
import { hideTooltip, showTooltip } from "./utils/tooltip";

let polyfillApplied = false;
let mathMLSupportCached: boolean | null = null;

/**
 * Check if the browser supports MathML natively.
 * Based on MDN's MathML detection approach.
 * Result is cached to avoid repeated DOM operations.
 */
function hasMathMLSupport(): boolean {
  if (mathMLSupportCached !== null) return mathMLSupportCached;
  if (typeof document === "undefined") return true;

  const div = document.createElement("div");
  div.innerHTML = "<math><mspace height='23px' width='77px'/></math>";
  document.body.appendChild(div);
  const box = (div.firstChild as Element)?.firstElementChild?.getBoundingClientRect();
  document.body.removeChild(div);

  if (!box) {
    mathMLSupportCached = false;
    return false;
  }
  mathMLSupportCached = Math.abs(box.height - 23) <= 1 && Math.abs(box.width - 77) <= 1;
  return mathMLSupportCached;
}

/**
 * Apply hfmath polyfill for browsers without MathML support.
 * Dynamically imports hfmath to avoid bundling for MathML-capable browsers.
 */
async function applyPolyfill(root: HTMLElement): Promise<void> {
  if (polyfillApplied) return;

  const { hfmath } = await import("hfmath");
  polyfillApplied = true;

  const mathRenders = root.querySelectorAll<HTMLElement>(".math-render");
  for (const renderEl of mathRenders) {
    const sourceEl = renderEl.parentElement?.querySelector<HTMLElement>(".math-source");
    if (!sourceEl) continue;

    const latex = sourceEl.textContent || "";
    if (!latex) continue;

    try {
      const eq = new hfmath(latex);
      const svg = eq.svg({
        SCALE_X: 7.5,
        SCALE_Y: 7.5,
        MARGIN_X: 0,
        MARGIN_Y: 0,
      });

      // Hide existing MathML for screen readers only
      const existingMath = renderEl.querySelector("math");
      if (existingMath) {
        existingMath.classList.add("visually-hidden");
      }

      // Insert SVG before MathML (or at end if no MathML)
      const svgContainer = document.createElement("span");
      svgContainer.className = "math-svg-polyfill";
      svgContainer.setAttribute("aria-hidden", "true");
      svgContainer.innerHTML = svg;

      // Style the SVG
      const svgEl = svgContainer.querySelector("svg");
      if (svgEl) {
        svgEl.style.verticalAlign = "middle";
        svgEl.style.display = "inline-block";
      }

      if (existingMath) {
        renderEl.insertBefore(svgContainer, existingMath);
      } else {
        renderEl.appendChild(svgContainer);
      }

      renderEl.classList.add("math-polyfilled");
    } catch (err) {
      console.error("[wdpr] Math polyfill error:", err);
    }
  }
}

/**
 * Initialize math functionality:
 * - Apply polyfill for browsers without MathML support
 * - Setup equation reference tooltips and scrolling
 */
export function initMath(root: HTMLElement): ModuleCleanup {
  const hasMath = root.querySelector(".math-block, .math-inline") !== null;

  if (hasMath && !hasMathMLSupport()) {
    void applyPolyfill(root);
  }

  // Equation reference handlers
  function handleMouseEnter(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;

    const eref = target.closest<HTMLElement>(".eref");
    if (!eref) return;

    const targetId = eref.dataset.target;
    if (!targetId) return;

    const equation = root.ownerDocument.getElementById(targetId);
    if (!equation) return;

    // Clone the math-render content for tooltip (using cloneNode to avoid XSS)
    const mathRender = equation.querySelector(".math-render");
    if (mathRender) {
      const tooltipEl = eref.querySelector<HTMLElement>(".eref-tooltip");
      if (tooltipEl) {
        tooltipEl.replaceChildren(mathRender.cloneNode(true));
        showTooltip(eref, tooltipEl);
      }
    }
  }

  function handleMouseLeave(e: MouseEvent): void {
    const target = e.target;
    if (!isElement(target)) return;

    const eref = target.closest(".eref");
    if (!eref) return;

    // Prevent flickering when moving between eref and tooltip
    const relatedTarget = e.relatedTarget;
    if (isElement(relatedTarget) && eref.contains(relatedTarget)) return;

    hideTooltip();
  }

  function handleClick(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;

    const link = target.closest<HTMLAnchorElement>(".eref-link");
    if (!link) return;

    e.preventDefault();
    const href = link.getAttribute("href");
    if (!href?.startsWith("#")) return;

    const equation = root.ownerDocument.getElementById(href.slice(1));
    if (equation) {
      equation.scrollIntoView({ behavior: "smooth", block: "center" });
      equation.focus();
    }
  }

  root.addEventListener("mouseenter", handleMouseEnter, true);
  root.addEventListener("mouseleave", handleMouseLeave as EventListener, true);
  root.addEventListener("click", handleClick, true);

  return {
    destroy() {
      root.removeEventListener("mouseenter", handleMouseEnter, true);
      root.removeEventListener("mouseleave", handleMouseLeave as EventListener, true);
      root.removeEventListener("click", handleClick, true);
    },
  };
}
