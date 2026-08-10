import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { existingPages } from "../src/worker/data";

describe("WDPR wiki boiler", () => {
  it("returns a complete SCP-JP Sigma document rendered from D1", async () => {
    const response = await exports.default.fetch("https://example.test/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('<body id="html-body">');
    expect(html).toContain('<div id="header">');
    expect(html).toContain('<div id="side-bar">');
    expect(html).toContain('<div id="main-content">');
    expect(html).toContain('<link rel="stylesheet" href="/style.css">');
    expect(html).toContain("is loaded from D1");
    expect(html).toContain("Current user: user");
    expect(html).toContain('class="pages-tag-cloud-box"');
    expect(html).toContain('id="footnote-1"');
    expect(html).toContain('sandbox="allow-scripts"');
    expect(html).toContain('src="http://localhost:8788/local--html/home/');
    expect(html).not.toContain('sandbox="allow-scripts allow-same-origin"');
  });

  it("maps a category-qualified URL to its D1 page", async () => {
    const response = await exports.default.fetch("https://example.test/docs:intro");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<div id="page-title">はじめに</div>');
    expect(html).toContain("bun run db:migrate:local");
  });

  it("keeps dates and authors in D1", async () => {
    const page = await env.DB.prepare(
      "SELECT title, created_at, updated_at, created_by FROM pages WHERE category = 'docs' AND unix_name = 'intro'",
    ).first<{ title: string; created_at: string; updated_at: string; created_by: number }>();

    expect(page).toEqual({
      title: "はじめに",
      created_at: "2026-06-10T09:00:00.000Z",
      updated_at: "2026-06-10T09:00:00.000Z",
      created_by: 1,
    });
  });

  it("serves content-addressed HTML blocks from R2", async () => {
    const page = await exports.default.fetch("https://example.test/");
    const html = await page.text();
    const path = /src="(http:\/\/localhost:8788\/local--html\/home\/[a-f0-9]{64})"/.exec(html)?.[1];
    expect(path).toBeDefined();

    expect(
      await env.HTML_BLOCKS.head(`local--html/home/${path!.split("/").at(-1)}`),
    ).not.toBeNull();
  });

  it("does not prepare a page-existence query for an empty target list", async () => {
    const db = {
      prepare(): never {
        throw new Error("D1 must not be queried");
      },
    } satisfies Pick<D1Database, "prepare">;

    expect(await existingPages(db, [])).toEqual(new Set());
  });

  it("splits page-existence queries at the D1 bind limit", async () => {
    const targets = ["home", ...Array.from({ length: 100 }, (_, index) => `missing-${index}`)];

    expect(await existingPages(env.DB, targets)).toEqual(new Set(["home"]));
  });

  it("keeps case-insensitive style terminators inside the CSS element", async () => {
    await env.DB.prepare("UPDATE pages SET source = ? WHERE id = 1")
      .bind(
        '[[module CSS]]\n.example { color: red; }</STYLE><script data-escaped="true">alert(1)</script>\n[[/module]]',
      )
      .run();

    const response = await exports.default.fetch("https://example.test/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).not.toContain('</STYLE><script data-escaped="true">');
    expect(html).toContain('<\\/style><script data-escaped="true">');
  });

  it("orders ListPages by creation date descending by default", async () => {
    await env.DB.prepare("UPDATE pages SET source = ? WHERE id = 1")
      .bind('[[module ListPages category="docs" limit="1"]]\n%%fullname%%\n[[/module]]')
      .run();

    const response = await exports.default.fetch("https://example.test/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("docs:pipeline");
  });

  it("uses the shared category and tag selector", async () => {
    await env.DB.prepare("UPDATE pages SET source = ? WHERE id = 1")
      .bind('[[module ListPages category="*" tags="+pipeline"]]\n%%fullname%%\n[[/module]]')
      .run();

    const response = await exports.default.fetch("https://example.test/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("docs:pipeline");
    expect(html).not.toContain("<p>docs:intro</p>");
  });

  it("resolves a module generated through a ListPages include", async () => {
    await env.DB.batch([
      env.DB.prepare("UPDATE pages SET source = ? WHERE id = 1").bind(
        '[[module ListPages category="docs" tags="+pipeline" limit="1"]]\n%%content%%\n[[/module]]',
      ),
      env.DB.prepare("UPDATE pages SET source = ? WHERE id = 5").bind("[[include component:note]]"),
      env.DB.prepare("UPDATE pages SET source = ? WHERE id = 7").bind(
        '[[module ListUsers users="."]]\nnested user: %%name%%\n[[/module]]',
      ),
    ]);

    const response = await exports.default.fetch("https://example.test/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("nested user: user");
    expect(html).not.toContain('data-module="list-users"');
  });
});
