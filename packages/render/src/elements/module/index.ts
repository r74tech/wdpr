/**
 * @module elements/module
 *
 * Dispatcher for `[[module ModuleName]]` elements.
 *
 * Wikidot modules are server-side components that generate dynamic content.
 * This renderer dispatches to the appropriate module-specific renderer based
 * on the module name. Supported modules include Rate, Join, Backlinks,
 * Categories, PageTree, ListPages, and ListUsers.
 *
 * Unknown module names produce a Wikidot-compatible error block with a
 * link to the modules documentation page.
 */

import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderBacklinks } from "./backlinks";
import { renderCategories } from "./categories";
import { renderJoin } from "./join";
import { renderPageTree } from "./page-tree";
import { renderRate } from "./rate";
import { renderListUsers } from "./listusers";
import { renderListPages } from "./listpages";

/**
 * Render a `[[module]]` element by dispatching on the module name.
 *
 * Each module outputs a container `<div>` with a module-specific CSS class.
 * Some modules (like Rate and Join) render interactive UI elements; others
 * (like Backlinks and ListPages) render empty containers that can be
 * populated at runtime.
 *
 * @param ctx - The current render context.
 * @param data - Module data with discriminated module type.
 */
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
