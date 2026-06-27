import type { Token } from "../../../lexer";
import type {
  CodeBlockData,
  Diagnostic,
  Element,
  TocEntry,
  Version,
  WikitextSettings,
} from "@wdprlib/ast";
import type { BlockRule, InlineRule } from "./rule";
import type { ScopeContext } from "./scope";

/**
 * Parser context passed to rules.
 *
 * Fields are grouped by lifecycle:
 * - Static config (`tokens`, `version`, `trackPositions`, `settings`, rule arrays).
 * - `pos`: per-scope cursor; kept top-level because every rule spread overrides it.
 * - Accumulators (`footnotes`, `tocEntries`, ..., `diagnostics`): shared by array identity.
 * - `scope`: per-scope state with immutable-replace semantics.
 */
export interface ParseContext {
  tokens: Token[];
  pos: number;
  version: Version;
  trackPositions: boolean;
  settings: WikitextSettings;
  footnotes: Element[][];
  tocEntries: TocEntry[];
  codeBlocks: CodeBlockData[];
  htmlBlocks: string[];
  bibcites: string[];
  blockRules: BlockRule[];
  blockFallbackRule: BlockRule;
  inlineRules: InlineRule[];
  diagnostics: Diagnostic[];
  scope: ScopeContext;
}
