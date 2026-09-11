import type { SyntaxTree, WikitextPageContext, WikitextSettings } from "@wdprlib/ast";
import type { RenderOptions, RenderResolvers, ResolvedUser } from "../types";

export interface RenderableWikitextDocument<
  TPage extends WikitextPageContext = WikitextPageContext,
> {
  ast: SyntaxTree;
  page: TPage;
  settings: WikitextSettings;
}

export interface RenderedHtmlBlock {
  index: number;
  content: string;
}

export interface WikitextRenderArtifacts {
  html: string;
  styles: string[];
  htmlBlocks: RenderedHtmlBlock[];
}

export type WikitextRenderResult<TDocument extends RenderableWikitextDocument> = Omit<
  TDocument,
  keyof WikitextRenderArtifacts
> &
  WikitextRenderArtifacts;

export interface RenderWikitextResolvers<TPage extends WikitextPageContext> {
  resolvePageExistence?: (pages: string[]) => Promise<ReadonlySet<string>>;
  /** Resolve canonical local page names to titles. Keys imply existence unless overridden. */
  resolvePageTitles?: (pages: string[]) => Promise<ReadonlyMap<string, string>>;
  resolveHtmlBlockUrl?: (input: { index: number; content: string; page: TPage }) => Promise<string>;
  /** Resolve rendered raw usernames in one asynchronous batch before the final render. */
  resolveUsers?: (
    usernames: string[],
    page: TPage,
  ) => Promise<ReadonlyMap<string, ResolvedUser | null>>;
  /** Synchronous fallback for usernames omitted from the `resolveUsers` result Map. */
  user?: RenderResolvers["user"];
}

export interface RenderWikitextOptions<TPage extends WikitextPageContext> extends Omit<
  RenderOptions,
  "settings" | "page" | "footnotes" | "resolvers"
> {
  styleMode?: "inline" | "separate";
  resolvers?: RenderWikitextResolvers<TPage>;
}
