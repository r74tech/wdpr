# wdpr

Wikidot markup parser and renderer.

## Packages

| Package | Description |
|---------|-------------|
| [@wdprlib/ast](./packages/ast) | AST type definitions |
| [@wdprlib/parser](./packages/parser) | Wikidot markup parser |
| [@wdprlib/render](./packages/render) | HTML renderer |
| [@wdprlib/runtime](./packages/runtime) | Client-side runtime for interactive elements |

## Installation

```bash
npm install @wdprlib/parser @wdprlib/render
```

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
