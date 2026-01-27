import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { initTabview } from "../src/tabview";

describe("tabview", () => {
  let window: Window;
  let document: Document;
  let root: HTMLElement;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    root = document.createElement("div");
    root.innerHTML = `
      <div class="yui-navset">
        <ul class="yui-nav">
          <li class="selected"><a href="javascript:;"><em>Tab 1</em></a></li>
          <li><a href="javascript:;"><em>Tab 2</em></a></li>
          <li><a href="javascript:;"><em>Tab 3</em></a></li>
        </ul>
        <div class="yui-content">
          <div>Content 1</div>
          <div style="display: none">Content 2</div>
          <div style="display: none">Content 3</div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  });

  test("switches tab on click", () => {
    const cleanup = initTabview(root);

    const tabs = root.querySelectorAll<HTMLElement>(".yui-nav li");
    tabs[1]!.querySelector("a")!.click();

    expect(tabs[0]!.classList.contains("selected")).toBe(false);
    expect(tabs[1]!.classList.contains("selected")).toBe(true);

    const contents = root.querySelectorAll<HTMLElement>(".yui-content > div");
    expect(contents[0]!.style.display).toBe("none");
    expect(contents[1]!.style.display).toBe("");

    cleanup.destroy();
  });
});
