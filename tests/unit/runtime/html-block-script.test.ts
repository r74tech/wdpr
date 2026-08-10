import { expect, test } from "bun:test";
import { HTML_BLOCK_RESIZE_SCRIPT } from "@wdprlib/runtime/html-block-script";

test("imports the HTML block resize script without the browser runtime", () => {
  expect(HTML_BLOCK_RESIZE_SCRIPT).toContain("wdpr-html-block-resize");
});
