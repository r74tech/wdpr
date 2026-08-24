# @wdprlib/parser

Parser for Wikidot markup.

## Installation

```bash
bun add @wdprlib/parser
```

## Usage

```ts
import { parse, processWikitext } from "@wdprlib/parser";

// Basic parsing keeps the AST-oriented low-level API available.
const { ast, diagnostics } = parse("**Hello** world");

// The high-level API expands includes, parses modules, and merges all
// side channels and diagnostics into one document.
const document = await processWikitext(source, {
  page: {
    fullName: "docs:start", // category-qualified Wikidot fullname
    unixName: "start", // separately named URL-safe page identifier
    tags: ["docs"],
    urlPath: "/docs:start/offset/0",
  },
  dataProvider: {
    fetchInclude: async (pageRef, { page }) => getPageSource(pageRef, page),
    fetchListPages: async (query, requirement, { page }) => queryPages(query, requirement, page),
    fetchListUsers: async (requirement, { page }) => queryUsers(requirement, page),
    fetchTagCloud: async (requirement, { page }) => queryTags(requirement, page),
  },
});

document.ast;
document.diagnostics;
document.dependencies; // direct and transitive includes, including module output
```

Pass `document` to `renderWikitext()` from `@wdprlib/render` for HTML generation.
The parser and renderer remain separate packages and both depend only on the shared AST contract.

## Features

- Wikidot markup parsing (bold, italic, links, images, tables, etc.)
- Include resolution (`[[include page]]`)
- Module support (ListPages, ListUsers, TagCloud, IfTags, etc.)
- `[[gallery]]` (auto-collection uses `page.files`; responsive layout and lightbox via `@wdprlib/runtime`)

- Data extraction for server-side rendering

## Related Packages

- [@wdprlib/ast](https://www.npmjs.com/package/@wdprlib/ast) - AST type definitions
- [@wdprlib/render](https://www.npmjs.com/package/@wdprlib/render) - HTML renderer
- [@wdprlib/decompiler](https://www.npmjs.com/package/@wdprlib/decompiler) - HTML to Wikidot decompiler
- [@wdprlib/runtime](https://www.npmjs.com/package/@wdprlib/runtime) - Client-side runtime

## License

AGPL-3.0 - See [LICENSE](https://github.com/r74tech/wdpr/blob/develop/LICENSE)
