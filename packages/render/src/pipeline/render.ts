import type { WikitextPageContext } from "@wdprlib/ast";
import { RenderContext } from "../context";
import { renderToHtmlWithStyles } from "../render";
import { renderElements } from "../render";
import type { PageContext, RenderOptions, RenderResolvers, ResolvedUser } from "../types";
import type {
  RenderableWikitextDocument,
  RenderedHtmlBlock,
  RenderWikitextOptions,
  WikitextRenderResult,
} from "./types";

export async function renderWikitext<TDocument extends RenderableWikitextDocument>(
  document: TDocument,
  options: RenderWikitextOptions<TDocument["page"]> = {},
): Promise<WikitextRenderResult<TDocument>> {
  const htmlBlocks: RenderedHtmlBlock[] = [];
  const pages: string[] = [];
  const seenPages = new Set<string>();
  const usernames: string[] = [];
  const seenUsers = options.resolvers?.resolveUsers ? new Set<string>() : null;
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
    user: seenUsers
      ? (username) => {
          if (!seenUsers.has(username)) {
            seenUsers.add(username);
            usernames.push(username);
          }
          return null;
        }
      : undefined,
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
  const pageTitles =
    options.resolvers?.resolvePageTitles && pages.length > 0
      ? await options.resolvers.resolvePageTitles(pages)
      : null;
  const resolvedUsers =
    options.resolvers?.resolveUsers && usernames.length > 0
      ? await options.resolvers.resolveUsers(usernames, document.page)
      : null;
  const finalPage = createPageContext(
    document.page,
    existingPages ? (target) => existingPages.has(target) : undefined,
  );
  if (pageTitles) finalPage.pageTitle = (target) => pageTitles.get(target);
  const finalOptions = createRenderOptions(document, options, finalPage, {
    user: createUserResolver(resolvedUsers, options.resolvers?.user),
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

function createUserResolver(
  resolvedUsers: ReadonlyMap<string, ResolvedUser | null> | null,
  fallback: RenderResolvers["user"],
): RenderResolvers["user"] {
  if (resolvedUsers === null) return fallback;

  return (username) =>
    resolvedUsers.has(username)
      ? (resolvedUsers.get(username) ?? null)
      : (fallback?.(username) ?? null);
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
