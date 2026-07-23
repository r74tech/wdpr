# @wdprlib/render

HTML renderer for Wikidot markup.

## Installation

```bash
bun add @wdprlib/render
```

## Usage

```ts
import { parse, processWikitext } from "@wdprlib/parser";
import { renderToHtml, renderWikitext } from "@wdprlib/render";
import type { PageContext } from "@wdprlib/render";

const { ast } = parse("**Hello** world");

// Basic rendering
const html = renderToHtml(ast);

// With page context and resolvers
const pageContext: PageContext = {
  pageName: "main",
  site: "mysite",
  domain: "mysite.example.com",
  pageExists: (name) => checkPageExists(name),
  // Image attachments of the page, shown by the content-less [[gallery]]
  // form (image/* with resized variants; createdAt enables order="created_at")
  files: [{ name: "photo.jpg", createdAt: 1700000000 }],
};

const html = renderToHtml(ast, {
  page: pageContext,
  footnotes: ast.footnotes,
  resolvers: {
    user: (username) => ({ name: username, displayName: "Display Name" }),
    htmlBlockUrl: (index) => `/local--html/page/${index}`,
  },
});
```

For an asynchronous application pipeline, parse first and render second. `@wdprlib/render`
does not import or depend on `@wdprlib/parser`:

```ts
const document = await processWikitext(source, {
  page: {
    fullName: "docs:start",
    unixName: "start",
    tags: ["docs"],
    urlPath: "/docs:start",
  },
  dataProvider,
});

const result = await renderWikitext(document, {
  styleMode: "separate",
  resolvers: {
    resolvePageExistence: async (pages) => findExistingPages(pages),
    resolveHtmlBlockUrl: async ({ index, content, page }) => {
      const hash = await storeHtmlBlock(content);
      return `/local--html/${page.fullName}/${index}/${hash}`;
    },
  },
});

result.html; // contains no <style> tags in separate mode
result.styles;
result.htmlBlocks;
result.diagnostics;
result.dependencies;
```

## Features

- HTML generation from AST
- Footnote and bibliography rendering
- User link resolution
- Embed block with configurable allowlist
- Math rendering (via Temml)
- XSS protection (via DOMPurify)

## Related Packages

- [@wdprlib/ast](https://www.npmjs.com/package/@wdprlib/ast) - AST type definitions
- [@wdprlib/parser](https://www.npmjs.com/package/@wdprlib/parser) - Wikidot markup parser
- [@wdprlib/decompiler](https://www.npmjs.com/package/@wdprlib/decompiler) - HTML to Wikidot decompiler
- [@wdprlib/runtime](https://www.npmjs.com/package/@wdprlib/runtime) - Client-side runtime

## License

AGPL-3.0 - See [LICENSE](https://github.com/r74tech/wdpr/blob/develop/LICENSE)
