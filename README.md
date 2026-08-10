# wdpr

Wikidot markup parser and renderer.

## Packages

| Package | Description |
|---------|-------------|
| [@wdprlib/ast](./packages/ast) | AST types for Wikidot markup |
| [@wdprlib/parser](./packages/parser) | Parser for Wikidot markup |
| [@wdprlib/render](./packages/render) | HTML renderer for Wikidot markup |
| [@wdprlib/decompiler](./packages/decompiler) | Decompiler for Wikidot markup |
| [@wdprlib/runtime](./packages/runtime) | Client-side runtime for Wikidot markup |

## Installation

```bash
npm install @wdprlib/parser @wdprlib/render
```

## Example

[WDPR Workers wiki starter](./examples/boiler-template) is a D1-backed starter using Cloudflare Workers, the official Cloudflare Vite plugin, Hono, vanilla TypeScript, and R2-backed HTML blocks.

## Usage

```ts
import { parse } from '@wdprlib/parser'
import { renderToHtml } from '@wdprlib/render'

const ast = parse('**Hello** world')
const html = renderToHtml(ast)
```

## Development

```bash
bun install
bun run build
bun test
```

## Acknowledgments

This project is inspired by [ftml](https://github.com/scpwiki/ftml) and the original [Wikidot Text_Wiki](https://github.com/gabrys/wikidot/tree/master/lib/Text_Wiki/Text).

## License

Available under the terms of the GNU Affero General Public License. See [LICENSE](LICENSE).
