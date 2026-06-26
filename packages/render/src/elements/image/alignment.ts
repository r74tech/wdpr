import type { FloatAlignment } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

export function pushAlignedImage(
  ctx: RenderContext,
  output: string,
  alignment: FloatAlignment | null,
): void {
  if (!alignment) {
    ctx.push(output);
    return;
  }

  const alignClass = getAlignmentClass(alignment.align, alignment.float);
  ctx.push(`<div class="image-container ${alignClass}">`);
  ctx.push(output);
  ctx.push("</div>");
}

function getAlignmentClass(align: string, isFloat: boolean): string {
  if (isFloat) {
    switch (align) {
      case "left":
        return "floatleft";
      case "right":
        return "floatright";
      case "center":
        return "floatcenter";
      default:
        return `float${align}`;
    }
  }

  switch (align) {
    case "left":
      return "alignleft";
    case "right":
      return "alignright";
    case "center":
      return "aligncenter";
    default:
      return `align${align}`;
  }
}
