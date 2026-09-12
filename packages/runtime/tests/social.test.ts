import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { parse } from "@wdprlib/parser";
import { renderToHtml, renderWikitext, type RenderOptions } from "@wdprlib/render";
import { createSettings } from "@wdprlib/ast";
import { htmlToAst, serialize } from "@wdprlib/decompiler";
import { initSocial } from "../src/social";

const all = "[[social twitter,hatena,linkedin,bluesky,mastodon,facebook,reddit]]";
const sourceUrl = "https://example.test/wiki:a?x=1&y=%22#section";
const sourceTitle = '日本語 "title" & <tag> {url}';
function setup(options: RenderOptions = {}, source = all) {
  const win = new Window({ url: sourceUrl });
  win.document.title = sourceTitle;
  const root = win.document.createElement("div");
  root.innerHTML = renderToHtml(parse(source).ast, options);
  // happy-dom leaves &lt;/&gt; encoded in attributes; browser decoding is checked separately.
  if (options.socialShare?.title !== undefined) {
    root
      .querySelector("span.wdpr-social")
      ?.setAttribute("data-wdpr-social-title", options.socialShare.title);
  }
  win.document.body.append(root);
  return { win, root: root as unknown as HTMLElement };
}
function checkLinks(root: HTMLElement, url: string, title: string) {
  const links = [...root.querySelectorAll("a")];
  expect(links).toHaveLength(7);
  const values = links.map((link) => new URL(link.href));
  expect(values.map((value) => value.hostname)).toEqual([
    "x.com",
    "b.hatena.ne.jp",
    "www.linkedin.com",
    "bsky.app",
    "share.joinmastodon.org",
    "www.facebook.com",
    "www.reddit.com",
  ]);
  for (const i of [0, 1, 2, 6]) expect(values[i]!.searchParams.get("url")).toBe(url);
  expect(values[5]!.searchParams.get("u")).toBe(url);
  expect(values[0]!.searchParams.get("text")).toBe(title);
  expect(values[6]!.searchParams.get("title")).toBe(title);
  const text = title ? `${title}\n\n${url}` : url;
  expect(values[3]!.searchParams.get("text")).toBe(text);
  expect(new URLSearchParams(values[4]!.hash.slice(1)).get("text")).toBe(text);
  expect(values[1]!.pathname).toBe("/entry/panel/");
  expect(values[1]!.hash).toBe("#bbutton");
  for (const link of links) {
    expect(link.getAttribute("aria-label")).toBeTruthy();
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
    expect(link.hasAttribute("aria-disabled")).toBe(false);
  }
}

test("generates SSR links and retains explicit metadata during runtime init", () => {
  const options = { socialShare: { url: sourceUrl, title: sourceTitle } };
  const { win, root } = setup(options);
  checkLinks(root, sourceUrl, sourceTitle);
  const before = root.innerHTML;
  win.document.title = "different";
  initSocial(root);
  initSocial(root);
  expect(root.innerHTML).toBe(before);
  expect(renderToHtml(parse(serialize(htmlToAst(before))).ast, options)).toBe(
    renderToHtml(parse(all).ast, options),
  );
});
test("uses the owning document and leaves links outside the requested root alone", () => {
  const { win, root } = setup();
  const outside = win.document.createElement("div");
  outside.innerHTML = root.innerHTML;
  win.document.body.append(outside);
  expect(root.querySelectorAll("a[href]")).toHaveLength(0);
  initSocial(root);
  checkLinks(root, sourceUrl, sourceTitle);
  expect(outside.querySelectorAll("a[href]")).toHaveLength(0);
});
test("preserves an explicitly empty title", () => {
  const { root } = setup({ socialShare: { title: "" } });
  initSocial(root);
  checkLinks(root, sourceUrl, "");
});
test.each(["javascript:alert(1)", "data:text/plain,x", "/relative", ""])(
  "leaves an invalid explicit URL disabled: %s",
  (url) => {
    const { root } = setup({ socialShare: { url } });
    expect(root.querySelectorAll("a[href]")).toHaveLength(0);
    initSocial(root);
    expect(root.querySelectorAll("a[href]")).toHaveLength(0);
    expect(root.querySelectorAll('a[aria-disabled="true"]')).toHaveLength(7);
  },
);
test("encodes lone surrogates without throwing, and never replaces metadata placeholders twice", () => {
  const title = 'a\uD800{url}{text}" onclick="bad';
  const expectedTitle = 'a\uFFFD{url}{text}" onclick="bad';
  const options = { socialShare: { url: sourceUrl, title } };
  const { root } = setup(options);
  checkLinks(root, sourceUrl, expectedTitle);
  expect(root.querySelector("[onclick]")).toBeNull();
  initSocial(root);
  checkLinks(root, sourceUrl, expectedTitle);
});
test.each([
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "java\tscript:alert(1)",
  "data:text/html,test",
  "/relative",
  "https://",
])("rejects an invalid URL injected into a template: %s", (template) => {
  const { root } = setup({ socialShare: { url: sourceUrl, title: sourceTitle } });
  const link = root.querySelector("a")!;
  expect(link.hasAttribute("href")).toBe(true);
  link.setAttribute("data-wdpr-social-template", template);
  initSocial(root);
  expect(link.hasAttribute("href")).toBe(false);
  expect(link.getAttribute("aria-disabled")).toBe("true");
});
test.each(["http:", "https:"])("reenables a valid share template using %s", (protocol) => {
  const { root } = setup();
  const link = root.querySelector("a")!;
  const template = `${protocol}//example.test/share?url={url}`;
  link.setAttribute("data-wdpr-social-template", "javascript:alert(1)");
  initSocial(root);
  link.setAttribute("data-wdpr-social-template", template);
  initSocial(root);
  expect(new URL(link.href).protocol).toBe(protocol);
  expect(new URL(link.href).searchParams.get("url")).toBe(sourceUrl);
  expect(link.hasAttribute("aria-disabled")).toBe(false);
});
test("encodes raw markup in templates without changing URL separators or existing escapes", () => {
  const { root } = setup();
  const link = root.querySelector("a")!;
  link.setAttribute(
    "data-wdpr-social-template",
    'https://example.test/share?label=<tag>"&encoded=%22&url={url}#section',
  );
  initSocial(root);
  expect(link.getAttribute("href")).toContain("label=%3Ctag%3E%22&encoded=%22&url=");
  const href = new URL(link.href);
  expect(href.searchParams.get("label")).toBe('<tag>"');
  expect(href.searchParams.get("encoded")).toBe('"');
  expect(href.searchParams.get("url")).toBe(sourceUrl);
  expect(href.hash).toBe("#section");
});
test("does not discard custom content added to generated markup during HTML import", () => {
  const { root } = setup();
  root.querySelector("a")!.append("keep me");
  const source = serialize(htmlToAst(root.innerHTML));
  expect(source).toContain("keep me");
  expect(source).not.toContain("[[social");
});
test("passes metadata through the high-level render pipeline", async () => {
  const result = await renderWikitext(
    { ast: parse(all).ast, page: { pageName: "example" }, settings: createSettings("page") },
    { socialShare: { url: sourceUrl, title: sourceTitle } },
  );
  const { root } = setup();
  root.innerHTML = result.html;
  checkLinks(root, sourceUrl, sourceTitle);
});

test("selects the Twitter bird or X logo with the same share destination", () => {
  const { root } = setup({}, "[[social twitter,x]]");
  const links = [...root.querySelectorAll("a")];
  expect(links.map((link) => link.getAttribute("aria-label"))).toEqual(["Twitter", "X"]);
  expect(links[0]!.querySelector("path")!.getAttribute("d")).not.toBe(
    links[1]!.querySelector("path")!.getAttribute("d"),
  );
  initSocial(root);
  expect(links[0]!.href).toBe(links[1]!.href);
  const source = serialize(htmlToAst(root.innerHTML));
  expect(source).toContain("[[social twitter,x]]");
  const defaultRoot = setup({}, "[[social]]").root;
  expect(defaultRoot.querySelectorAll('[data-wdpr-social-site="x"]')).toHaveLength(1);
  expect(defaultRoot.querySelectorAll('[data-wdpr-social-site="twitter"]')).toHaveLength(0);
  expect(defaultRoot.querySelectorAll("a")).toHaveLength(7);
});
