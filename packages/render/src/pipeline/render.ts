import type { WikitextPageContext } from "@wdprlib/ast";
import { RenderContext } from "../context";
import { renderToHtmlWithStyles } from "../render";
import { renderElements } from "../render";
import type { PageContext, RenderOptions } from "../types";
import type {
  RenderableWikitextDocument,
  RenderedHtmlBlock,
  RenderWikitextOptions,
  WikitextRenderResult,
} from "./types";

export async function renderWikitext<
  TPage extends WikitextPageContext,
  TDocument extends RenderableWikitextDocument<TPage>,
>(
  document: TDocument,
  options: RenderWikitextOptions<TPage> = {},
): Promise<WikitextRenderResult<TDocument>> {
  const htmlBlocks: RenderedHtmlBlock[] = [];
  const pages: string[] = [];
  const seenPages = new Set<string>();
  const collectionPage = createPageContext(document.page, (target) => {
    if (!seenPages.has(target)) {
      seenPages.add(target);
      pages.push(target);
    }
    return true;
  });
  const collectionOptions = createRenderOptions(document, options, collectionPage, {
    htmlBlockUrl: (index, content) => {
      htmlBlocks.push({ index, content });
      return "about:blank";
    },
  });
  const collectionContext = new RenderContext(document.ast, collectionOptions, {
    discardOutput: true,
  });
  renderElements(collectionContext, document.ast.elements);

  const existingPages =
    options.resolvers?.resolvePageExistence && pages.length > 0
      ? await options.resolvers.resolvePageExistence(pages)
      : null;
  const htmlUrls = options.resolvers?.resolveHtmlBlockUrl
    ? await Promise.all(
        htmlBlocks.map((block) =>
          options.resolvers!.resolveHtmlBlockUrl!({ ...block, page: document.page }),
        ),
      )
    : null;
  const finalPage = createPageContext(
    document.page,
    existingPages ? (target) => existingPages.has(target) : undefined,
  );
  const finalOptions = createRenderOptions(document, options, finalPage, {
    user: options.resolvers?.user,
    htmlBlockUrl: htmlUrls ? (index) => htmlUrls[index] ?? "" : undefined,
  });
  const rendered = renderToHtmlWithStyles(
    document.ast,
    finalOptions,
    options.styleMode !== "separate",
  );

  return {
    ...document,
    html: rendered.html,
    styles: rendered.styles,
    htmlBlocks,
  } as WikitextRenderResult<TDocument>;
}

function createPageContext<TPage extends WikitextPageContext>(
  page: TPage,
  pageExists: ((page: string) => boolean) | undefined,
): PageContext {
  return {
    pageName: page.fullName,
    tags: page.tags,
    site: page.site,
    domain: page.domain,
    siteDomains: page.siteDomains,
    resolveSiteDomain: page.resolveSiteDomain,
    files: page.files,
    pageExists,
  };
}

function createRenderOptions<
  TPage extends WikitextPageContext,
  TDocument extends RenderableWikitextDocument<TPage>,
>(
  document: TDocument,
  options: RenderWikitextOptions<TPage>,
  page: PageContext,
  resolvers: NonNullable<RenderOptions["resolvers"]>,
): RenderOptions {
  const { styleMode: _styleMode, resolvers: _asyncResolvers, ...baseOptions } = options;
  return {
    ...baseOptions,
    settings: document.settings,
    page,
    resolvers,
  };
}
