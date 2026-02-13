# @wdprlib/render

HTML renderer for Wikidot markup.

## Installation

```bash
bun add @wdprlib/render
```

## Usage

```ts
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import type { PageContext, RenderOptions } from "@wdprlib/render";

const ast = parse("**Hello** world");

// Basic rendering
const html = renderToHtml(ast);

// With page context and resolvers
const pageContext: PageContext = {
  pageName: "main",
  site: "mysite",
  domain: "mysite.example.com",
  pageExists: (name) => checkPageExists(name),
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
