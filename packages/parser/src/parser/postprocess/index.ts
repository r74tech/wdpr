/**
 *
 * Post-processing pipeline for the parsed AST.
 *
 * After the main parser produces an initial AST, post-processing transforms handle
 * behaviors that cannot be resolved during single-pass parsing. This includes merging
 * paragraphs around `span_` (paragraph-strip) elements, splitting paragraphs at
 * empty `[[#expr ]]` elements, and cleaning internal flags that were used as
 * inter-pass communication markers.
 *
 * @module
 */

export { mergeSpanStripParagraphs, cleanInternalFlags } from "./spanStrip";
export { suppressDivAdjacentParagraphs } from "./divAdjacentParagraph";
export { splitAlignedImageParagraphs } from "./splitAlignedImage";
export { unwrapImageParagraphs } from "./imageParagraphUnwrap";
