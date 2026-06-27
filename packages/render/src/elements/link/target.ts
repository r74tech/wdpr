import type { AnchorTarget } from "@wdprlib/ast";

const TARGET_VALUES: Record<AnchorTarget, string> = {
  "new-tab": "_blank",
  parent: "_parent",
  top: "_top",
  same: "_self",
};

export function renderTargetAttributes(attrs: string[], target: AnchorTarget | null): void {
  if (!target) {
    return;
  }

  const targetValue = TARGET_VALUES[target] ?? "_blank";
  attrs.push(`target="${targetValue}"`);
  if (targetValue === "_blank") {
    attrs.push(`rel="noopener noreferrer"`);
  }
}
