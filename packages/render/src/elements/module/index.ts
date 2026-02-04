import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderBacklinks } from "./backlinks";
import { renderCategories } from "./categories";
import { renderJoin } from "./join";
import { renderPageTree } from "./page-tree";
import { renderRate } from "./rate";
import { renderListUsers } from "./listusers";
import { renderListPages } from "./listpages";

/** Render a module element */
export function renderModule(ctx: RenderContext, data: Module): void {
  switch (data.module) {
    case "unknown":
      // Render error block for unknown modules
      ctx.push(
        `<div class="error-block">[[module <em>${data.name}</em>]] No such module, please <a href="https://www.wikidot.com/doc:modules" target="_blank" rel="noopener noreferrer">check available modules</a> and fix this page.</div>`,
      );
      break;
    case "backlinks":
      renderBacklinks(ctx, data);
      break;
    case "categories":
      renderCategories(ctx, data);
      break;
    case "join":
      renderJoin(ctx, data);
      break;
    case "page-tree":
      renderPageTree(ctx, data);
      break;
    case "rate":
      renderRate(ctx);
      break;
    case "list-users":
      renderListUsers(ctx, data);
      break;
    case "list-pages":
      renderListPages(ctx, data);
      break;
  }
}
