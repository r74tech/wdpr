import type { Position } from "@wdprlib/ast";
import type { ParseContext } from "../../types";

export function addHtmlDisabledDiagnostic(ctx: ParseContext, position: Position): void {
  ctx.diagnostics.push({
    severity: "info",
    code: "html-block-disabled",
    message: "[[html]] block ignored: disabled by settings",
    position,
  });
}
