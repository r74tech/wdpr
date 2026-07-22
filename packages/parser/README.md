# @wdprlib/parser

Parser for Wikidot markup.

## Installation

```bash
bun add @wdprlib/parser
```

## Usage

```ts
import { parse, resolveIncludes, extractDataRequirements, resolveModules } from '@wdprlib/parser'
import type { SyntaxTree, PageRef } from '@wdprlib/parser'

// Basic parsing
const tree: SyntaxTree = parse('**Hello** world')

// Full pipeline with includes and modules
const source = '[[include component:box]]\n[[module ListPages]]\n%%title%%\n[[/module]]'

// 1. Resolve includes
const expanded = resolveIncludes(source, (ref: PageRef) => {
  return getPageSource(ref.page) // your function to fetch page source
})

// 2. Parse
const ast = parse(expanded)

// 3. Extract data requirements for modules
const { requirements, compiledListPagesTemplates } = extractDataRequirements(ast)

// 4. Resolve modules with external data
const resolved = await resolveModules(ast, {
  fetchListPages: async (query) => {
    // Fetch pages matching query from your database
    return { pages: [...], totalCount: 100, site: { name: 'mysite' } }
  },
  fetchTagCloud: async ({ category, limit }) => {
    // Fetch up to `limit` tags (weight = page count) for `[[module TagCloud]]`,
    // ordered by weight descending. `category` is the raw, untrusted attribute
    // value — look it up with a parameterized query and return the normalized name
    const found = category ? await findCategory(category) : null // your lookup
    if (category && !found) return { status: 'category-not-found', category }
    return { status: 'ok', tags: [{ tag: 'scp', weight: 42 }], category: found?.unixName ?? null }
  },
  getPageTags: () => ['tag1', 'tag2'],
}, {
  parse,
  compiledListPagesTemplates,
  requirements,
})
```

## Features

- Wikidot markup parsing (bold, italic, links, images, tables, etc.)
- Include resolution (`[[include page]]`)
- Module support (ListPages, ListUsers, TagCloud, IfTags, etc.)
- Data extraction for server-side rendering

## Related Packages

- [@wdprlib/ast](https://www.npmjs.com/package/@wdprlib/ast) - AST type definitions
- [@wdprlib/render](https://www.npmjs.com/package/@wdprlib/render) - HTML renderer
- [@wdprlib/decompiler](https://www.npmjs.com/package/@wdprlib/decompiler) - HTML to Wikidot decompiler
- [@wdprlib/runtime](https://www.npmjs.com/package/@wdprlib/runtime) - Client-side runtime

## License

AGPL-3.0 - See [LICENSE](https://github.com/r74tech/wdpr/blob/develop/LICENSE)
