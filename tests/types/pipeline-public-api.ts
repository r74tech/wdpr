import { DEFAULT_SETTINGS, type SyntaxTree } from "@wdprlib/ast";
import { processWikitext } from "@wdprlib/parser";
import type { ParserOptions } from "@wdprlib/parser";
import {
  renderWikitext,
  renderToHtml,
  renderMessages,
  type RenderMessageId,
  type RenderOptions,
  type RenderResolvers,
  type ResolvedUser,
} from "@wdprlib/render";

export async function compilePublicPipelineContracts(): Promise<void> {
  const parserOptions: ParserOptions = {
    // @ts-expect-error include deferral is an internal pipeline concern
    deferInclude: () => true,
  };
  void parserOptions;

  const document = await processWikitext("source", {
    page: {
      fullName: "category:page",
      unixName: "page",
      tags: ["tag"],
      urlPath: "/category:page",
    },
  });
  const result = await renderWikitext({
    ...document,
    customField: "preserved",
    html: 123,
    styles: "stale",
    htmlBlocks: false,
  });

  const html: string = result.html;
  const styles: string[] = result.styles;
  const customField: string = result.customField;
  void [html, styles, customField];

  // @ts-expect-error artifact collisions are replaced with the public result type
  const invalidHtml: number = result.html;
  void invalidHtml;

  const lowLevelCompatibility: RenderOptions = {
    i18n: {
      locale: "ja",
      messages: { "toc.title": "目次" },
      onError: (_error, id) => {
        const messageId: RenderMessageId = id;
        const source: string = renderMessages[messageId];
        void source;
      },
    },
    resolvers: {
      htmlBlockUrl: (index) => `/html/${index}`,
      user: (username) => ({ name: username }),
    },
  };
  void lowLevelCompatibility;

  const lowLevelResolvers: RenderResolvers = {
    user: (username) => ({ name: username }),
    // @ts-expect-error bulk user resolution belongs to the high-level pipeline only
    resolveUsers: async () => new Map(),
  };
  void lowLevelResolvers;

  const ast: SyntaxTree = { elements: [] };
  renderToHtml(ast, lowLevelCompatibility);
  await renderWikitext(document, lowLevelCompatibility);
  await renderWikitext({
    ast,
    settings: DEFAULT_SETTINGS,
    page: { fullName: "page", tags: [] },
  });

  await renderWikitext(
    {
      ast,
      settings: DEFAULT_SETTINGS,
      page: { fullName: "page", tags: [], tenantId: "tenant" },
    },
    {
      resolvers: {
        resolveUsers: async (usernames, batchPage) => {
          const tenantId: string = batchPage.tenantId;
          const resolved: ReadonlyMap<string, ResolvedUser | null> = new Map([
            [usernames[0] ?? "unknown", null],
          ]);
          void tenantId;
          return resolved;
        },
        user: (username) => ({ name: username }),
      },
    },
  );

  processWikitext("source", {
    page: {
      // @ts-expect-error high-level page context requires an explicit category-qualified fullName
      pageName: "ambiguous",
      tags: [],
    },
  });
}
