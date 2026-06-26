import type { BibliographyCiteData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeAttr, escapeHtml } from "../../escape";
import { generateBibliographyIdSuffix } from "./ids";

export function renderBibliographyCite(ctx: RenderContext, data: BibliographyCiteData): void {
  const number = ctx.getBibliographyCitationNumber(data.label);
  const counter = ctx.nextBibciteCounter();

  if (number === undefined) {
    ctx.push(escapeHtml(data.label));
    return;
  }

  const idSuffix = generateBibliographyIdSuffix(data.label, counter);
  const id = ctx.generateId(`bibcite-${number}-`, idSuffix);
  const bibitemId = ctx.generateId("bibitem-", number);
  const onclick = `WIKIDOT.page.utils.scrollToReference('${bibitemId}')`;

  ctx.push(`<a href="javascript:;" class="bibcite" id="${id}" onclick="${escapeAttr(onclick)}">`);
  ctx.push(String(number));
  ctx.push("</a>");
}
