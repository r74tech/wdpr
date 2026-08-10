import { DEFAULT_SETTINGS, processWikitext, type ProcessedWikitextDocument } from "@wdprlib/parser";
import { renderWikitext, type WikitextRenderResult } from "@wdprlib/render";
import {
  existingPages,
  findPage,
  listCurrentUser,
  listPages,
  listTags,
  type WikiPage,
} from "./data";

interface RenderPageDependencies {
  db: D1Database;
  htmlBlocks: R2Bucket;
  origin: string;
  htmlBlockOrigin: string;
}

const TRUSTED_PAGE_SETTINGS = { ...DEFAULT_SETTINGS, allowStyleElements: true };

export async function renderPage(
  page: WikiPage,
  dependencies: RenderPageDependencies,
): Promise<WikitextRenderResult<ProcessedWikitextDocument>> {
  const document = await processWikitext(page.source, {
    settings: TRUSTED_PAGE_SETTINGS,
    page: {
      fullName: page.fullname,
      unixName: page.name,
      tags: page.tags,
      urlPath: `/${page.fullname}`,
      site: "wdpr-boiler",
      domain: new URL(dependencies.origin).host,
    },
    dataProvider: {
      fetchInclude: async (pageRef) => {
        if (pageRef.site !== null) return null;
        return (await findPage(dependencies.db, pageRef.page))?.source ?? null;
      },
      fetchListPages: (query) => listPages(dependencies.db, query, page),
      fetchListUsers: () => listCurrentUser(dependencies.db),
      fetchTagCloud: (requirement) =>
        listTags(dependencies.db, requirement.category, requirement.limit),
    },
  });

  return renderWikitext(document, {
    styleMode: "separate",
    htmlBlockSandbox: "allow-scripts",
    resolvers: {
      user: (username) =>
        username.toLowerCase() === page.createdBy?.unixName ? { name: page.createdBy.name } : null,
      resolvePageExistence: (targets) => existingPages(dependencies.db, targets),
      resolveHtmlBlockUrl: async ({ content }) => {
        const hash = await sha256(content);
        await dependencies.htmlBlocks.put(`local--html/${page.fullname}/${hash}`, content, {
          httpMetadata: { contentType: "text/html; charset=utf-8" },
          onlyIf: { etagDoesNotMatch: "*" },
        });
        return `${dependencies.htmlBlockOrigin.replace(/\/$/, "")}/local--html/${encodeURIComponent(page.fullname)}/${hash}`;
      },
    },
  });
}

async function sha256(content: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
