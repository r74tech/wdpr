# @wdprlib/runtime

Client-side runtime for Wikidot markup.

## Installation

```bash
bun add @wdprlib/runtime
```

## Usage

```ts
import { initWdprRuntime } from "@wdprlib/runtime";
import type { WdprRuntime, RuntimeOptions } from "@wdprlib/runtime";

// Initialize after DOM is ready
const runtime: WdprRuntime = initWdprRuntime({
  root: document.getElementById("page-content") as HTMLElement,
  onRate: async (pageId, points) => {
    const res = await fetch("/api/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_id: pageId, points }),
    });
    return res.json();
  },
});

// Cleanup when navigating away or re-rendering
runtime.destroy();
```

### HTML block script for server runtimes

Workers that only serve HTML block iframe content can import the resize script without loading the
browser runtime or its DOM types:

```ts
import { HTML_BLOCK_RESIZE_SCRIPT } from "@wdprlib/runtime/html-block-script";
```

The existing root import remains available for browser applications.

## Features

- Tabview tab switching
- Collapsible block toggle
- Table of contents navigation
- Footnote / bibliography interactions
- Foldable list toggle
- Responsive gallery layout and lightbox navigation
- Math rendering (MathML with SVG polyfill via hfmath)
- Rating module callbacks
- Date formatting (odate)
- Email obfuscation reveal

## Related Packages

- [@wdprlib/ast](https://www.npmjs.com/package/@wdprlib/ast) - AST type definitions
- [@wdprlib/parser](https://www.npmjs.com/package/@wdprlib/parser) - Wikidot markup parser
- [@wdprlib/render](https://www.npmjs.com/package/@wdprlib/render) - HTML renderer
- [@wdprlib/decompiler](https://www.npmjs.com/package/@wdprlib/decompiler) - HTML to Wikidot decompiler

## License

AGPL-3.0 - See [LICENSE](https://github.com/r74tech/wdpr/blob/develop/LICENSE)
