/**
 * Shared CSS value definitions used across parser and renderer.
 *
 * @module
 */

/**
 * All CSS length units (plus percentage) accepted where Wikidot markup
 * takes a size value.
 *
 * This is intentionally a superset of what legacy Wikidot accepts: wdpr
 * extends size validation to modern CSS units (viewport, container-query,
 * and root-relative units) instead of mirroring Wikidot's historical
 * `px|em|%` allowlists. Units are canonicalized to lowercase.
 *
 * @group CSS
 */
export const CSS_LENGTH_UNITS = [
  // Container-query units
  "cqmax",
  "cqmin",
  "cqw",
  "cqh",
  "cqi",
  "cqb",
  // Viewport units
  "svmin",
  "svmax",
  "lvmin",
  "lvmax",
  "dvmin",
  "dvmax",
  "vmin",
  "vmax",
  "svw",
  "svh",
  "svi",
  "svb",
  "lvw",
  "lvh",
  "lvi",
  "lvb",
  "dvw",
  "dvh",
  "dvi",
  "dvb",
  "vw",
  "vh",
  "vi",
  "vb",
  // Root-relative font units
  "rcap",
  "rem",
  "rex",
  "rch",
  "ric",
  "rlh",
  // Font-relative units
  "cap",
  "em",
  "ex",
  "ch",
  "ic",
  "lh",
  // Absolute units
  "cm",
  "mm",
  "in",
  "pc",
  "pt",
  "px",
  "q",
  // Percentage
  "%",
] as const;

/**
 * A CSS length unit (or percentage) accepted in size values,
 * canonicalized to lowercase.
 *
 * @group CSS
 */
export type CssLengthUnit = (typeof CSS_LENGTH_UNITS)[number];
