/**
 *
 * Parser rule for the Wikidot `[[module TagCloud]]` block.
 *
 * Parses font size, color, target, limit, and category attributes into a
 * `tag-cloud` Module AST node, mirroring the validation behavior of Wikidot's
 * `PagesTagCloudModule`. Invalid font size or color formats produce an error
 * block element, matching Wikidot's ProcessException messages.
 *
 * @module
 */

import { CSS_LENGTH_UNITS, type CssLengthUnit, type Element, type Module } from "@wdprlib/ast";
import type { ModuleRule } from "../types";

/**
 * Matches a font size value like `300%`, `2em`, or `16px`.
 *
 * Wikidot only accepts `px`, `em`, and `%` here; wdpr deliberately extends
 * this to all CSS length units (see `CSS_LENGTH_UNITS`), case-insensitively.
 */
const FONT_SIZE_PATTERN = new RegExp(`^([0-9]+)(${CSS_LENGTH_UNITS.join("|")})$`, "i");

/** Matches a color value like `64,64,128` (range is not enforced, per Wikidot). */
const COLOR_PATTERN = /^[0-9]+,[0-9]+,[0-9]+$/;

/** Matches a strictly positive integer, mirroring PHP's `is_numeric` + `> 0` gate. */
const POSITIVE_INT_PATTERN = /^[0-9]+$/;

const ERROR_FONT_FORMAT =
  "Unsupported format for font size. Use a number followed by a CSS length unit such as px, em or %.";
const ERROR_FONT_MISMATCH = "Format for minFontSize and maxFontSize must use the same unit.";
const ERROR_COLOR_FORMAT =
  'Unsupported color format. Use "RRR,GGG,BBB" for Red,Green,Blue each within 0-255 range.';

/** Build the Wikidot-compatible error block for invalid attribute values. */
function errorBlock(message: string): Element {
  return {
    element: "container",
    data: {
      type: "div",
      attributes: { class: "error-block" },
      elements: [{ element: "text", data: message }],
    },
  };
}

/** Parse a limit value, falling back to 50 unless it is a safe positive integer. */
function parseLimit(value: string | undefined): number {
  if (!value || !POSITIVE_INT_PATTERN.test(value)) return 50;
  const num = Number.parseInt(value, 10);
  return Number.isSafeInteger(num) && num > 0 ? num : 50;
}

/** Normalize a target path to `/<path>/tag/`, or the Wikidot default. */
function normalizeTarget(value: string | undefined): string {
  if (!value) return "/system:page-tags/tag/";
  let target = value;
  if (!target.startsWith("/")) target = `/${target}`;
  if (!target.endsWith("/")) target = `${target}/`;
  return `${target}tag/`;
}

/** Parse a `R,G,B` color string into a tuple (input must match COLOR_PATTERN). */
function parseColor(value: string): [number, number, number] {
  const [r = 0, g = 0, b = 0] = value.split(",").map((part) => Number.parseInt(part, 10));
  return [r, g, b];
}

/**
 * Module rule for `[[module TagCloud]]`.
 *
 * Displays a weighted cloud of page tags. Font sizes and colors are only
 * honored when both min and max are given (Wikidot behavior); otherwise the
 * defaults (100%-300%, rgb(128,128,192)-rgb(64,64,128)) apply. Tag data is
 * supplied during the resolution phase via `DataProvider.fetchTagCloud`.
 */
export const tagCloudModuleRule: ModuleRule = {
  name: "module-tagcloud",
  acceptsNames: ["tagcloud"],
  hasBody: false,

  parse(_ctx, _pos, args): Module | Element {
    const maxFontSize = args.maxfontsize;
    const minFontSize = args.minfontsize;
    const maxColor = args.maxcolor;
    const minColor = args.mincolor;

    let sizeSmall = 100;
    let sizeBig = 300;
    let fontSizeUnit: CssLengthUnit = "%";
    if (maxFontSize && minFontSize) {
      const maxMatch = FONT_SIZE_PATTERN.exec(maxFontSize);
      if (!maxMatch) return errorBlock(ERROR_FONT_FORMAT);
      const maxUnit = (maxMatch[2] as string).toLowerCase() as CssLengthUnit;
      const minMatch = FONT_SIZE_PATTERN.exec(minFontSize);
      if (!minMatch || (minMatch[2] as string).toLowerCase() !== maxUnit) {
        return errorBlock(ERROR_FONT_MISMATCH);
      }
      sizeBig = Number.parseInt(maxMatch[1] as string, 10);
      sizeSmall = Number.parseInt(minMatch[1] as string, 10);
      fontSizeUnit = maxUnit;
    }

    let colorSmall: [number, number, number] = [128, 128, 192];
    let colorBig: [number, number, number] = [64, 64, 128];
    if (maxColor && minColor) {
      if (!COLOR_PATTERN.test(maxColor) || !COLOR_PATTERN.test(minColor)) {
        return errorBlock(ERROR_COLOR_FORMAT);
      }
      colorSmall = parseColor(minColor);
      colorBig = parseColor(maxColor);
    }

    return {
      module: "tag-cloud",
      "min-font-size": sizeSmall,
      "max-font-size": sizeBig,
      "font-size-unit": fontSizeUnit,
      "min-color": colorSmall,
      "max-color": colorBig,
      target: normalizeTarget(args.target),
      limit: parseLimit(args.limit),
      category: args.category || null,
    };
  },
};
