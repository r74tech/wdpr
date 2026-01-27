import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { initRate } from "../../src/modules/rate";

describe("modules/rate", () => {
  let window: Window;
  let document: Document;
  let root: HTMLElement;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    root = document.createElement("div");
    root.innerHTML = `
      <div class="page-rate-widget-box" data-page-id="page-123">
        <span class="rateup"><a href="javascript:;">+</a></span>
        <span class="rate-points number">+5</span>
        <span class="ratedown"><a href="javascript:;">-</a></span>
        <span class="cancel"><a href="javascript:;">x</a></span>
      </div>
    `;
    document.body.appendChild(root);
  });

  test("calls onRate with +1 on rateup click", async () => {
    let calledWith: { pageId: string; points: number } | null = null;

    const cleanup = initRate(root, {
      onRate: async (pageId, points) => {
        calledWith = { pageId, points };
        return { points: 6, votes: 10, percent: 60 };
      },
    });

    const rateup = root.querySelector<HTMLElement>(".rateup")!;
    rateup.click();

    // Wait for async
    await new Promise((r) => setTimeout(r, 10));

    expect(calledWith).toEqual({ pageId: "page-123", points: 1 });

    cleanup.destroy();
  });

  test("does nothing without onRate callback", () => {
    const cleanup = initRate(root, {});

    const rateup = root.querySelector<HTMLElement>(".rateup")!;
    rateup.click();
    // No error thrown

    cleanup.destroy();
  });
});
