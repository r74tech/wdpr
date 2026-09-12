import type { LinkData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { normalizePageName } from "../../context/page-name";

export interface ResolvedPageLink {
  name: string;
  title: string | null | undefined;
  exists: boolean;
}

/** Share one existence/title lookup between the link's class and label. */
export function resolvePage(ctx: RenderContext, data: LinkData): ResolvedPageLink | null {
  if (data.type !== "page" || typeof data.link !== "object") return null;
  const { site, page } = data.link;
  if (site || page.startsWith("/") || page.includes("#/")) return null;
  const name = normalizePageName(page.split("#")[0]!);
  const explicitExists = ctx.page?.pageExists?.(name);
  const title =
    explicitExists !== false && (data.label === "page" || explicitExists === undefined)
      ? ctx.page?.pageTitle?.(name)
      : undefined;
  return { name, title, exists: explicitExists ?? title != null };
}
