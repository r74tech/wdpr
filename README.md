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

## Build information

Every package exports its own build information:

```ts
import { buildInfo } from '@wdprlib/render'

buildInfo.version // This package's version
buildInfo.sha     // Full source commit SHA, or null when unavailable
buildInfo.dirty   // Uncommitted repository changes, or null when unavailable
```

The object is read-only and frozen. It records a snapshot when metadata is generated,
not the current state of the consuming application. `dirty` includes tracked and
untracked changes across the repository, excluding ignored files. Dependency package
versions are not included. ESM, CommonJS and Bun exports carry the same snapshot.

## Development

```bash
bun install
bun run build
bun test
```

`bun install` and build startup generate package metadata automatically. Run
`bun run build:info` after changing the checkout when using source imports without
rebuilding. Restart `bun run dev` to refresh metadata during watch development.
Generated metadata is included in published packages; consumers do not need Git.

## Origins

wdpr began as an independent TypeScript implementation of Wikidot markup. Its syntax behavior, AST compatibility, and parser design were developed with reference to the following projects, and portions of the project were later adapted from them:

- [ftml](https://github.com/scpwiki/ftml), licensed under the [GNU Affero General Public License v3.0 or later](https://github.com/scpwiki/ftml/blob/master/LICENSE.md).
- [Wikidot Text_Wiki](https://github.com/gabrys/wikidot/tree/master/lib/Text_Wiki/Text), licensed under the [GNU Lesser General Public License v2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html).

See [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) for the applicable notices and licenses.

## License

Available under the terms of the GNU Affero General Public License. See [LICENSE](LICENSE).
