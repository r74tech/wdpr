import { preprocess } from "../preprocess";
import { preprocessExpr } from "../preprocess/expr";
import { preprocessIftags } from "../rules/block/module/iftags/preprocess";
import type { ParserOptions } from "./options";

export function prepareSourceForParse(source: string, options: ParserOptions | undefined): string {
  const ifProcessed = preprocessExpr(source);
  const iftagsProcessed =
    options?.pageTags !== undefined ? preprocessIftags(ifProcessed, options.pageTags) : ifProcessed;
  return preprocess(iftagsProcessed);
}
