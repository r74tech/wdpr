# @wdprlib/decompiler

Decompiler for Wikidot markup.

## Installation

```bash
bun add @wdprlib/decompiler
```

## Usage

```ts
import { decompile } from "@wdprlib/decompiler";

// HTML → Wikidot syntax
const wikidot = decompile("<p><strong>Hello</strong> world</p>");
// => "**Hello** world"
```

### Step-by-step

```ts
import { htmlToAst, serialize } from "@wdprlib/decompiler";

// 1. HTML → AST
const tree = htmlToAst("<p>Hello</p>");

// 2. Inspect or transform the AST...

// 3. AST → Wikidot syntax
const wikidot = serialize(tree);
```

## API

### `decompile(html, options?)`

Converts HTML to Wikidot syntax in one call (HTML → AST → serialize).

### `htmlToAst(html, options?)`

Converts HTML to a Wikidot AST (`SyntaxTree`). Footnote content is extracted and stored in `tree.footnotes`.

### `serialize(tree, options?)`

Converts a Wikidot AST to markup text.

## Limitations

- <span style="color: #b01;">**Best-effort conversion**</span>: re-parsing the output should produce structurally equivalent HTML
- Code block language detection from highlighted HTML is not supported
- Modules (`[[module ...]]`), includes, iftags, comments are out of scope

## Related Packages

- [@wdprlib/ast](https://www.npmjs.com/package/@wdprlib/ast) - AST type definitions
- [@wdprlib/parser](https://www.npmjs.com/package/@wdprlib/parser) - Wikidot markup parser
- [@wdprlib/render](https://www.npmjs.com/package/@wdprlib/render) - HTML renderer
- [@wdprlib/runtime](https://www.npmjs.com/package/@wdprlib/runtime) - Client-side runtime

## License

AGPL-3.0 - See [LICENSE](https://github.com/r74tech/wdpr/blob/develop/LICENSE)
