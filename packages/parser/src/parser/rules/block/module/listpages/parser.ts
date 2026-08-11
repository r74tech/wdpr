/**
 *
 * Parser rule for the Wikidot `[[module ListPages ...]]` block.
 *
 * Parses the module's attributes into a structured `list-pages` Module AST node.
 * Handles hyphenated (`link-to`), concatenated (`linkto`), and snake_case (`link_to`)
 * attribute name formats. The raw attribute values are preserved in the `attributes`
 * field for `@URL` resolution by external applications.
 *
 * @module
 */

import type { Module } from "@wdprlib/ast";
import type { ModuleRule } from "../types";
import { parseBool, parseInt32 } from "../utils";

/**
 * Module rule for `[[module ListPages ...]]`.
 *
 * ListPages is the most complex Wikidot module. It queries pages by various
 * criteria (tags, category, parent, date, rating, etc.) and renders each matching
 * page using a template specified in the module body. The template uses
 * `%%variable%%` syntax to reference page data.
 *
 * This rule only handles parsing; data fetching and template rendering are handled
 * by the extract/resolve pipeline.
 */
export const listPagesModuleRule: ModuleRule = {
  name: "module-listpages",
  acceptsNames: ["listpages"],
  hasBody: true,

  parse(_ctx, _pos, args, body): Module {
    // Extract known attributes, pass rest as additional attributes
    // Note: attribute names are normalized to lowercase by parseAttributesRaw
    const {
      category,
      tags,
      parent,
      rating,
      votes,
      name,
      fullname,
      range,
      pagetype,
      offset,
      limit,
      order,
      reverse,
      separate,
      wrapper,
      rss,
    } = args;
    // Compound attributes accept Wikidot's supported spelling variants.
    const linkTo = args["link-to"] ?? args.linkto ?? args.link_to;
    const createdBy = args["created-by"] ?? args.createdby ?? args.created_by;
    const createdAt = args["created-at"] ?? args.createdat ?? args.created_at;
    const updatedAt = args["updated-at"] ?? args.updatedat ?? args.updated_at;
    const perPage = args["per-page"] ?? args.perpage ?? args.per_page;
    const prependLine = args["prepend-line"] ?? args.prependline ?? args.prepend_line;
    const appendLine = args["append-line"] ?? args.appendline ?? args.append_line;
    const rssDescription = args["rss-description"] ?? args.rssdescription ?? args.rss_description;
    const rssHome = args["rss-home"] ?? args.rsshome ?? args.rss_home;
    const rssLimit = args["rss-limit"] ?? args.rsslimit ?? args.rss_limit;
    const rssOnly = args["rss-only"] ?? args.rssonly ?? args.rss_only;
    const urlAttrPrefix = args["url-attr-prefix"] ?? args.urlattrprefix ?? args.url_attr_prefix;

    // Store all raw arguments for @URL resolution by external apps
    const rawArgs: Record<string, string> = { ...args };

    return {
      module: "list-pages",
      category,
      tags,
      parent,
      "link-to": linkTo,
      "created-by": createdBy,
      "created-at": createdAt,
      "updated-at": updatedAt,
      rating,
      votes,
      name,
      fullname,
      range,
      pagetype,
      offset: parseInt32(offset),
      limit: parseInt32(limit),
      "per-page": parseInt32(perPage),
      order,
      reverse: parseBool(reverse, false),
      separate: parseBool(separate, true),
      wrapper: parseBool(wrapper, true),
      "prepend-line": prependLine,
      "append-line": appendLine,
      rss,
      "rss-description": rssDescription,
      "rss-home": rssHome,
      "rss-limit": parseInt32(rssLimit),
      "rss-only": parseBool(rssOnly, false),
      "url-attr-prefix": urlAttrPrefix,
      body,
      // All raw arguments for @URL resolution
      attributes: rawArgs,
    };
  },
};
