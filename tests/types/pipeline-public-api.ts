import { DEFAULT_SETTINGS, type SyntaxTree } from "@wdprlib/ast";
import { processWikitext } from "@wdprlib/parser";
import { renderWikitext, type RenderOptions } from "@wdprlib/render";

export async function compilePublicPipelineContracts(): Promise<void> {
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
    resolvers: {
      htmlBlockUrl: (index) => `/html/${index}`,
    },
  };
  void lowLevelCompatibility;

  const ast: SyntaxTree = { elements: [] };
  await renderWikitext({
    ast,
    settings: DEFAULT_SETTINGS,
    page: { fullName: "page", tags: [] },
  });

  processWikitext("source", {
    page: {
      // @ts-expect-error high-level page context requires an explicit category-qualified fullName
      pageName: "ambiguous",
      tags: [],
    },
  });
}
