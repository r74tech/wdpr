# wdpr

Wikidot markup parser and renderer.

## Packages

| Package | Description |
|---------|-------------|
| [@wdpr/ast](./packages/ast) | AST type definitions |
| [@wdpr/parser](./packages/parser) | Wikidot markup parser |
| [@wdpr/render](./packages/render) | HTML renderer |
| [@wdpr/runtime](./packages/runtime) | Client-side runtime for interactive elements |

## Installation

```bash
npm install @wdpr/parser @wdpr/render
```

## Usage

```ts
import { parse } from '@wdpr/parser'
import { renderToHtml } from '@wdpr/render'

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
