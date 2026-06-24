import type { PageData, SiteContext } from "./external-data";

/**
 * Context passed to a compiled ListPages template.
 */
export interface VariableContext {
  page: PageData;
  index: number;
  total: number;
  limit?: number;
  site: SiteContext;
}

/**
 * Compiled template function.
 */
export type CompiledTemplate = (ctx: VariableContext) => string;
