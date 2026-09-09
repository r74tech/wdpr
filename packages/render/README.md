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
  // form (createdAt enables order="created_at")
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

Image `size` presets are emitted as display widths while keeping the original image URL. Gallery
items use the same display-size contract; initialize `@wdprlib/runtime` for the responsive layout
and lightbox behavior.

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
    resolveUsers: async (usernames, page) => findUsers(usernames, page),
  },
});

result.html; // contains no <style> tags in separate mode
result.styles;
result.htmlBlocks;
result.diagnostics;
result.dependencies;
```

## Internationalization

Pass a caller-owned [ICU MessageFormat](https://formatjs.github.io/docs/core-concepts/icu-syntax/)
catalog through `i18n` on either `renderToHtml` or `renderWikitext`:

```ts
import { renderToHtml } from "@wdprlib/render";
import messages from "./catalogs/ja.json";

const html = renderToHtml(ast, {
  i18n: {
    locale: "ja",
    messages,
    onError: (error, id) => console.warn(`Invalid renderer message: ${id}`, error),
  },
});
```

The application loads and updates community catalogs, selects the locale, and merges any
language/region fallback catalogs before rendering. The renderer performs no catalog fetches
and bundles no translated catalogs. `renderMessages` exports the stable message IDs and English
source messages; `RenderMessageId` and `RenderI18n` expose the corresponding types.
This list is generated from `{ id, defaultMessage }` declarations at renderer call sites.
After changing a declaration, run `bun run messages:extract` in the repository root.
CI runs `bun run messages:check` to detect a stale list. Unmarked UI text still requires review.
After `bun run build`, `bun run test:build` checks CommonJS exports using Node.js 22+.

For example, a catalog can contain:

```json
{
  "toc.title": "目次",
  "footnote.title": "脚注",
  "include.missing": "<createLink>{page} を作成する</createLink>（ページが存在しません）"
}
```

`include.missing` receives `{page}` and the `<createLink>` tag. `module.unknown` receives
`{name}`, `<emphasis>`, and `<documentationLink>`. These tags can move within the translated
sentence, but their HTML and URLs remain renderer-owned. Other messages take no arguments or
tags. Translations are text, not raw HTML; ICU quoting allows literal markup characters.
Wikidot's source-string keys, `%s` placeholders, and wiki links must be converted to these IDs,
named arguments, and rich tags when importing a catalog.

Without `i18n`, existing English output is retained. Missing entries and invalid ICU messages
fall back to English formatted with `en`; invalid messages also call `onError` when supplied.
Throwing from `onError` aborts rendering. Empty translations are preserved. Author-provided
titles and collapsible labels override translated defaults. Catalogs should remain unchanged
during a render; separate calls may use different catalogs concurrently. `renderWikitext` can
report a catalog error in both its collection and final render passes.

## Security defaults

- `[[embed]]` accepts HTTPS iframes only. Inline `style` attributes are removed; use the allowed
  `width` and `height` attributes for sizing.
- Local image and gallery paths reject traversal segments, encoded path components, backslashes,
  NUL bytes, query strings, and fragments.
- `createSettings("page")` and `DEFAULT_SETTINGS` keep `[[module CSS]]` disabled. Enable it only
  when the CSS source is trusted:

```ts
import { createSettings } from "@wdprlib/ast";

const trustedPageSettings = {
  ...createSettings("page"),
  allowStyleElements: true,
};
```

- HTML block iframes use an empty `sandbox` attribute by default. Set `htmlBlockSandbox: null`
  only when Wikidot-compatible unsandboxed execution is explicitly required. Avoid combining
  `allow-scripts` and `allow-same-origin` for same-origin content because that can negate the
  sandbox.

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
