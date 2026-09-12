import { expect, test, mock } from "bun:test";
import { Window } from "happy-dom";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { initPageButtons } from "../src/page-buttons";

test.each(["source", "edit", "delete"])("routes %s to the host and cleans up", (action) => {
  const win = new Window({ url: "https://example.test/page" });
  const root = win.document.createElement("div");
  root.innerHTML = renderToHtml(parse(`[[button ${action}]]`).ast);
  win.document.body.append(root);
  const onPageAction = mock(() => {});
  const handle = initPageButtons(root as unknown as HTMLElement, { onPageAction });
  const anchor = root.querySelector("a")!;
  const click = new win.MouseEvent("click", { bubbles: true, cancelable: true });
  anchor.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(onPageAction).toHaveBeenCalledTimes(1);
  expect(onPageAction).toHaveBeenCalledWith(action);
  expect(win.location.href).toBe("https://example.test/page");
  handle.destroy();
  anchor.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true }));
  expect(onPageAction).toHaveBeenCalledTimes(1);
});

test("ignores unconfigured actions without navigating to the fragment", () => {
  const win = new Window();
  const root = win.document.createElement("div");
  root.innerHTML = renderToHtml(parse("[[button print]]").ast);
  const handle = initPageButtons(root as unknown as HTMLElement);
  const click = new win.MouseEvent("click", { bubbles: true, cancelable: true });
  root.querySelector("a")!.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  handle.destroy();
});
