import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { initMath } from "../src/math";

test("scrolls a resolved reference to the numbered equation and removes the listener", () => {
  const win = new Window();
  const root = win.document.createElement("div");
  root.innerHTML = renderToHtml(parse("[[eref sample]]\n\n[[math sample]]\nx\n[[/math]]").ast);
  win.document.body.append(root);
  const target = root.querySelector<HTMLElement>("#equation-1")!;
  target.scrollIntoView = mock(() => {});
  const handle = initMath(root as unknown as HTMLElement);
  const link = root.querySelector(".eref-link")!;
  const click = new win.MouseEvent("click", { bubbles: true, cancelable: true });
  link.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  handle.destroy();
  link.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
});
