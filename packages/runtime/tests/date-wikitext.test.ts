import { afterEach, describe, expect, test, setSystemTime } from "bun:test";
import { Window } from "happy-dom";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { initOdate } from "../src/odate";

afterEach(() => setSystemTime());
function renderDate(source: string) {
  const win = new Window();
  const root = win.document.createElement("div");
  root.innerHTML = renderToHtml(parse(source).ast);
  initOdate(root as unknown as HTMLElement);
  return { win, root, date: root.querySelector("span.odate") };
}

describe("date wikitext runtime", () => {
  test("uses the user's local date with the saved format encoding", () => {
    const { date } = renderDate('[[date 1216153821 format="%d. %m. %Y|agohover"]]');
    const local = new Date(1216153821000);
    expect(date?.textContent).toBe(
      `${String(local.getDate()).padStart(2, "0")}. ${String(local.getMonth() + 1).padStart(2, "0")}. ${local.getFullYear()}`,
    );
    expect(date?.getAttribute("title")).toMatch(/\d+ days ago/);
  });
  test("expands locale representation", () => {
    const { date } = renderDate('[[date 1237135440 format="%c"]]');
    expect(date?.textContent).toBe(new Date(1237135440000).toLocaleString());
  });
  test("uses elapsed time for %O and refreshes hover text", () => {
    setSystemTime(new Date(681746400000 + 2 * 86400000));
    const { date, win } = renderDate('[[date 681746400 format="James is %O young|agohover"]]');
    expect(date?.textContent).toBe("James is 2 days young");
    expect(date?.getAttribute("title")).toBe("2 days ago");
    setSystemTime(new Date(681746400000 + 3 * 86400000));
    date?.dispatchEvent(new win.MouseEvent("mouseover"));
    expect(date?.getAttribute("title")).toBe("3 days ago");
  });
});

test("uses the locale default when no format is specified", () => {
  const { date } = renderDate("[[date 1216153821]]");
  expect(date?.textContent).toBe(new Date(1216153821000).toLocaleString());
});

test("expands timezone and composite formats without interpreting literal percents", () => {
  const { date } = renderDate('[[date 1237135440 format="%Z %z %R %%Y %Q"]]');
  const local = new Date(1237135440000);
  expect(date?.textContent).toContain(
    `${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")} %Y %Q`,
  );
  expect(date?.textContent).not.toContain("%Z");
  expect(date?.textContent).toMatch(/[+-]\d{4}/);
});

test("writes formatted text without creating HTML elements", () => {
  const { date } = renderDate('[[date 1237135440 format="<img src=x> %Y"]]');
  expect(date?.textContent).toBe("<img src=x> 2009");
  expect(date?.querySelector("img")).toBeNull();
});

test("removes an earlier hover listener when reinitialized without agohover", () => {
  const { date, root, win } = renderDate('[[date 1237135440 format="%Y|agohover"]]');
  date!.className = "odate time_1237135440 format_%25Y";
  initOdate(root as unknown as HTMLElement);
  date!.dispatchEvent(new win.MouseEvent("mouseover"));
  expect(date?.hasAttribute("title")).toBe(false);
});
