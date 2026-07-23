/**
 * Sentinel prefix for style slot placeholders in {@link SyntaxTree.styles}.
 *
 * When the resolver encounters an unresolved `[[iftags]]` block containing
 * `[[module CSS]]`, it inserts a sentinel string (`STYLE_SLOT_PREFIX + slotId`)
 * into the styles array to preserve source order. At render time the sentinel
 * is replaced with the actual CSS collected from the iftags block (if the
 * condition matches).
 *
 * A null-byte prefix ensures no collision with valid CSS content.
 */
export const STYLE_SLOT_PREFIX = "\0__IFTAGS_SLOT__";

/**
 * Sentinel prefix for invisible style-position anchors retained in the AST.
 *
 * The suffix is the previously collected CSS text. Renderers must not emit
 * these synthetic style elements.
 */
export const STYLE_ANCHOR_PREFIX = "\0__STYLE_ANCHOR__";
