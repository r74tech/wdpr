import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { initCollapsible } from "../src/collapsible";

describe("collapsible", () => {
  let window: Window;
  let document: Document;
  let root: HTMLElement;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    root = document.createElement("div");
    root.innerHTML = `
      <div class="collapsible-block">
        <div class="collapsible-block-folded" style="display: block">
          <a class="collapsible-block-link" href="javascript:;">Show</a>
        </div>
        <div class="collapsible-block-unfolded" style="display: none">
          <a class="collapsible-block-link" href="javascript:;">Hide</a>
          <div class="collapsible-block-content">Content here</div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  });

  test("unfolds on click", () => {
    const cleanup = initCollapsible(root, { fade: false });

    const showLink = root.querySelector<HTMLElement>(".collapsible-block-folded a")!;
    showLink.click();

    const folded = root.querySelector<HTMLElement>(".collapsible-block-folded")!;
    const unfolded = root.querySelector<HTMLElement>(".collapsible-block-unfolded")!;

    expect(folded.style.display).toBe("none");
    expect(unfolded.style.display).toBe("block");

    cleanup.destroy();
  });

  test("folds back on click", () => {
    const cleanup = initCollapsible(root, { fade: false });

    // Unfold first
    const showLink = root.querySelector<HTMLElement>(".collapsible-block-folded a")!;
    showLink.click();

    // Fold back
    const hideLink = root.querySelector<HTMLElement>(".collapsible-block-unfolded a")!;
    hideLink.click();

    const folded = root.querySelector<HTMLElement>(".collapsible-block-folded")!;
    const unfolded = root.querySelector<HTMLElement>(".collapsible-block-unfolded")!;

    expect(folded.style.display).toBe("block");
    expect(unfolded.style.display).toBe("none");

    cleanup.destroy();
  });

  test("destroy removes listener", () => {
    const cleanup = initCollapsible(root, { fade: false });
    cleanup.destroy();

    const showLink = root.querySelector<HTMLElement>(".collapsible-block-folded a")!;
    showLink.click();

    const folded = root.querySelector<HTMLElement>(".collapsible-block-folded")!;
    expect(folded.style.display).toBe("block");
  });
});
