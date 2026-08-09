# @wdprlib/ast

AST types for Wikidot markup.

## Installation

```bash
bun add @wdprlib/ast
```

## Usage

```ts
import type { SyntaxTree, Element } from "@wdprlib/ast";
import { text, paragraph, bold } from "@wdprlib/ast";

// Create AST nodes
const tree: SyntaxTree = {
  elements: [paragraph([bold([text("Hello")]), text(" world")])],
};
```

## Security-sensitive settings

`createSettings(mode)` supplies safe defaults for parser and renderer capabilities. In every mode,
including `"page"`, `allowStyleElements` defaults to `false` because `[[module CSS]]` affects the
entire host page. Callers may override it to `true` only for trusted CSS:

```ts
import { createSettings } from "@wdprlib/ast";

const settings = {
  ...createSettings("page"),
  allowStyleElements: true,
};
```

## Exports

Types: `SyntaxTree`, `Element`, `ElementName`, `ContainerType`, `AttributeMap`, `LinkType`, `ListType`, `Module`, etc.

Helpers: `text`, `paragraph`, `bold`, `italics`, `heading`, `link`, `list`, `lineBreak`, `horizontalRule`

## Related Packages

- [@wdprlib/parser](https://www.npmjs.com/package/@wdprlib/parser) - Wikidot markup parser
- [@wdprlib/render](https://www.npmjs.com/package/@wdprlib/render) - HTML renderer
- [@wdprlib/decompiler](https://www.npmjs.com/package/@wdprlib/decompiler) - HTML to Wikidot decompiler
- [@wdprlib/runtime](https://www.npmjs.com/package/@wdprlib/runtime) - Client-side runtime

## License

AGPL-3.0 - See [LICENSE](https://github.com/r74tech/wdpr/blob/develop/LICENSE)
