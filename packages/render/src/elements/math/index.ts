/**
 *
 * Renderers for Wikidot mathematical notation elements.
 *
 * - `[[math]]...[[/math]]` -- display-mode (block) math
 * - `[[$ ... $]]` -- inline math
 * - `[[eref name]]` -- equation reference
 *
 * @module
 */

export { renderMath } from "./block";
export { renderMathInline } from "./inline";
export { renderEquationRef } from "./equation-ref";
