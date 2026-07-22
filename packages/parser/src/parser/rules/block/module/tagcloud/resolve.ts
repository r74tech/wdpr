/**
 *
 * TagCloud module resolution.
 *
 * After the application has fetched tag data based on the extracted
 * requirements, this module expands the `tag-cloud` AST node into concrete
 * elements: a `div.pages-tag-cloud-box` container with one `a.tag` anchor per
 * tag, styled with linearly interpolated font sizes and colors, matching
 * Wikidot's `PagesTagCloudModule` output.
 *
 * Unlike ListPages/ListUsers there is no template body, so the expansion
 * builds AST elements directly instead of re-parsing wikitext.
 *
 * Note: TagCloud modules appearing inside the expanded output of other
 * dynamic modules (e.g. a ListPages body) are not resolved — the resolver
 * does not re-walk expansion results. This matches the behavior of all
 * dynamic modules.
 *
 * @module
 */

import type { Element, Module } from "@wdprlib/ast";
import type { TagCloudExternalData, TagCloudTagData } from "./types";

/**
 * Narrowed type for the tag-cloud variant of the Module discriminated union.
 */
export type TagCloudModuleData = Extract<Module, { module: "tag-cloud" }>;

/**
 * Type guard to check if a Module is a tag-cloud module.
 *
 * @param module - A Module discriminated union value
 * @returns true if the module is a tag-cloud module
 */
export function isTagCloudModule(module: Module): module is TagCloudModuleData {
  return module.module === "tag-cloud";
}

/** Wikidot's message shown when the site has no tags at all. */
const NO_TAGS_MESSAGE_PREFIX =
  "It seems you have no tags attached to pages. To attach a tag simply click on the ";
const NO_TAGS_MESSAGE_SUFFIX = " button at the bottom of any page.";

/** Encode a tag for use in a URL path segment, matching PHP's `rawurlencode`. */
function rawUrlEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Select and order tags the way Wikidot's SQL does: weight descending
 * (ties broken by tag name ascending) limited to `limit`, then tag name
 * ascending for display.
 */
function selectTags(tags: TagCloudTagData[], limit: number): TagCloudTagData[] {
  return tags
    .toSorted((a, b) => b.weight - a.weight || compareTags(a.tag, b.tag))
    .slice(0, limit)
    .toSorted((a, b) => compareTags(a.tag, b.tag));
}

/** Locale-independent code point comparison for deterministic tag ordering. */
function compareTags(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Resolve a single TagCloud module by expanding fetched tag data into a
 * `div.pages-tag-cloud-box` with weighted `a.tag` anchors.
 *
 * Font sizes and colors are interpolated linearly between the module's
 * min/max values based on each tag's weight relative to the weight range of
 * the selected tags (all tags get the minimum when the range is zero).
 *
 * @param module - The tag-cloud module data from the AST
 * @param data - External tag data fetched by the application
 * @returns Array of AST elements replacing the module node
 */
export function resolveTagCloud(module: TagCloudModuleData, data: TagCloudExternalData): Element[] {
  if (data.status === "category-not-found") {
    return [
      {
        element: "container",
        data: {
          type: "div",
          attributes: { class: "error-block" },
          elements: [{ element: "text", data: `Category "${data.category}" can not be found.` }],
        },
      },
    ];
  }

  const tags = selectTags(data.tags, module.limit);
  if (tags.length === 0) {
    return [noTagsMessage()];
  }

  let minWeight = Number.POSITIVE_INFINITY;
  let maxWeight = Number.NEGATIVE_INFINITY;
  for (const tag of tags) {
    if (tag.weight < minWeight) minWeight = tag.weight;
    if (tag.weight > maxWeight) maxWeight = tag.weight;
  }
  const weightRange = maxWeight - minWeight;

  const categorySuffix = data.category !== null ? `/category/${rawUrlEncode(data.category)}` : "";

  const anchors: Element[] = [];
  for (const tag of tags) {
    const a = weightRange === 0 ? 0 : (tag.weight - minWeight) / weightRange;
    const fontSize = interpolate(module["min-font-size"], module["max-font-size"], a);
    const [r, g, b] = ([0, 1, 2] as const).map((i) =>
      interpolate(module["min-color"][i], module["max-color"][i], a),
    ) as [number, number, number];

    anchors.push({ element: "text", data: "\n" });
    anchors.push({
      element: "anchor",
      data: {
        target: null,
        attributes: {
          class: "tag",
          href: `${module.target}${rawUrlEncode(tag.tag)}${categorySuffix}`,
          style: `font-size: ${fontSize}${module["font-size-unit"]}; color: rgb(${r}, ${g}, ${b});`,
        },
        elements: [{ element: "text", data: tag.tag }],
      },
    });
  }
  anchors.push({ element: "text", data: "\n" });

  return [
    {
      element: "container",
      data: {
        type: "div",
        attributes: { class: "pages-tag-cloud-box" },
        elements: anchors,
      },
    },
  ];
}

/** Linearly interpolate between min and max, rounded like PHP's `round`. */
function interpolate(min: number, max: number, a: number): number {
  return Math.round(min + (max - min) * a);
}

/** Wikidot's "no tags" paragraph, shown when the fetcher returns zero tags. */
function noTagsMessage(): Element {
  return {
    element: "container",
    data: {
      type: "paragraph",
      attributes: {},
      elements: [
        { element: "text", data: NO_TAGS_MESSAGE_PREFIX },
        {
          element: "container",
          data: {
            type: "italics",
            attributes: {},
            elements: [{ element: "text", data: "tags" }],
          },
        },
        { element: "text", data: NO_TAGS_MESSAGE_SUFFIX },
      ],
    },
  };
}
