import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { initToc } from "../src/toc";

describe("toc", () => {
  let window: Window;
  let document: Document;
  let root: HTMLElement;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    root = document.createElement("div");
    root.innerHTML = `
      <div id="toc">
        <div id="toc-action-bar">
          <a href="javascript:;">Fold</a>
          <a style="display: none" href="javascript:;">Unfold</a>
        </div>
        <div id="toc-list">
          <div><a href="#heading1">Heading 1</a></div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  });

  test("folds TOC on click", () => {
    const cleanup = initToc(root);

    const foldLink = root.querySelector<HTMLElement>("#toc-action-bar a")!;
    foldLink.click();

    const tocList = root.querySelector<HTMLElement>("#toc-list")!;
    expect(tocList.style.display).toBe("none");

    const links = root.querySelectorAll<HTMLElement>("#toc-action-bar a");
    expect(links[0]!.style.display).toBe("none");
    expect(links[1]!.style.display).toBe("");

    cleanup.destroy();
  });

  test("unfolds TOC on click", () => {
    const cleanup = initToc(root);

    // Fold first
    const foldLink = root.querySelector<HTMLElement>("#toc-action-bar a")!;
    foldLink.click();

    // Unfold
    const unfoldLink = root.querySelectorAll<HTMLElement>("#toc-action-bar a")[1]!;
    unfoldLink.click();

    const tocList = root.querySelector<HTMLElement>("#toc-list")!;
    expect(tocList.style.display).toBe("");

    cleanup.destroy();
  });
});
