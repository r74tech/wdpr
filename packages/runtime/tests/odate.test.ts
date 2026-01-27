import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { initOdate } from "../src/odate";

describe("odate", () => {
  let window: Window;
  let document: Document;
  let root: HTMLElement;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  test("formats timestamp to local date", () => {
    // 2020-01-15 12:30:00 UTC = 1579091400
    root.innerHTML = `<span class="odate time_1579091400">fallback</span>`;
    initOdate(root);

    const el = root.querySelector("span")!;
    // The output depends on local timezone, but should not be "fallback" anymore
    expect(el.textContent).not.toBe("fallback");
    expect(el.textContent!.length).toBeGreaterThan(0);
  });

  test("uses custom format", () => {
    // format: %Y-%m-%d → "2020-01-15" (in UTC timezone)
    root.innerHTML = `<span class="odate time_1579091400 format%25Y-%25m-%25d">fallback</span>`;
    initOdate(root);

    const el = root.querySelector("span")!;
    // Should contain year 2020
    expect(el.textContent).toContain("2020");
  });

  test("ignores elements without timestamp", () => {
    root.innerHTML = `<span class="odate">no timestamp</span>`;
    initOdate(root);

    const el = root.querySelector("span")!;
    expect(el.textContent).toBe("no timestamp");
  });
});
