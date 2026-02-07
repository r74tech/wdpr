/**
 *
 * Parser rule for the Wikidot `[[module ListPages ...]]` block.
 *
 * Parses the module's attributes into a structured `list-pages` Module AST node.
 * Handles both hyphenated (`link-to`) and concatenated (`linkto`) attribute name
 * formats, as Wikidot normalizes both to lowercase. The raw attribute values are
 * preserved in the `attributes` field for `@URL` resolution by external applications.
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
    // Hyphenated attributes (stored with hyphens in lowercase)
    const linkTo = args["link-to"] ?? args.linkto;
    const createdBy = args["created-by"] ?? args.createdby;
    const createdAt = args["created-at"] ?? args.createdat;
    const updatedAt = args["updated-at"] ?? args.updatedat;
    const perPage = args["per-page"] ?? args.perpage;
    const prependLine = args["prepend-line"] ?? args.prependline;
    const appendLine = args["append-line"] ?? args.appendline;
    const rssDescription = args["rss-description"] ?? args.rssdescription;
    const rssHome = args["rss-home"] ?? args.rsshome;
    const rssLimit = args["rss-limit"] ?? args.rsslimit;
    const rssOnly = args["rss-only"] ?? args.rssonly;
    const urlAttrPrefix = args["url-attr-prefix"] ?? args.urlattrprefix;

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
