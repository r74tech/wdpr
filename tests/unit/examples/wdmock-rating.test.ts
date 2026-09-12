import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database, type SQLQueryBindings } from "bun:sqlite";
import { Window } from "happy-dom";
import { api } from "../../../examples/wdmock-cf/apps/main/src/routes/api";
import { renderPage } from "../../../examples/wdmock-cf/apps/main/src/services/pipeline";
import { deletePage } from "../../../examples/wdmock-cf/packages/db/src/pages";

let sqlite: Database;
const d1 = {
  prepare(sql: string) {
    function statement(values: SQLQueryBindings[] = []) {
      if (values.length > 100) throw new Error("D1 bound parameter limit exceeded");
      return {
        bind: (...parameters: SQLQueryBindings[]) => statement(parameters),
        first: async () => sqlite.query(sql).get(...values),
        all: async () => ({ results: sqlite.query(sql).all(...values) }),
        run: async () => {
          const result = sqlite.query(sql).run(...values);
          return {
            success: true,
            meta: { changes: result.changes, last_row_id: result.lastInsertRowid },
          };
        },
      };
    }
    return statement();
  },
  async batch(statements: { run: () => Promise<unknown> }[]) {
    sqlite.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  },
};

beforeEach(async () => {
  sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec(await Bun.file("examples/wdmock-cf/migrations/0001_schema.sql").text());
  sqlite.exec(await Bun.file("examples/wdmock-cf/migrations/0002_page_lock.sql").text());
  const migration = Bun.file("examples/wdmock-cf/migrations/0003_custom_rating.sql");
  sqlite.exec(await migration.text());
  for (const [id, name, source] of [
    [1, "main", "[[module Rate]]"],
    [2, "included", "[[include main]]"],
    [3, "plain", "No rating"],
    [4, "custom", '[[module CustomRate key="theme"]]'],
  ]) {
    sqlite
      .query("INSERT INTO pages (page_id, unix_name, source) VALUES (?, ?, ?)")
      .run(id, name, source);
  }
});

test("a site axis supplies CustomRate and persists votes separately on each display page", async () => {
  sqlite.exec(`INSERT INTO site_rating_axes (site_id, axis_key, label, allow_nv)
    VALUES (1, 'theme', 'テーマ適合性', 1)`);
  sqlite.exec(`INSERT INTO pages (page_id, unix_name, source)
    VALUES (5, 'custom-included', '[[include custom]]')`);
  const ref = { kind: "custom", axisKey: "theme" };
  const response = await post(4, { type: "vote", value: 0 }, ref);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    ref,
    label: "テーマ適合性",
    allowedVotes: [1, 0, -1],
    currentVote: 0,
    aggregate: { points: 0, votes: 1, percent: 0 },
  });
  expect((await post(5, { type: "vote", value: 1 }, ref)).status).toBe(200);
  expect(
    sqlite.query("SELECT page_id, rate FROM page_custom_rate_vote ORDER BY page_id").all(),
  ).toEqual([
    { page_id: 4, rate: 0 },
    { page_id: 5, rate: 1 },
  ]);
  expect(sqlite.query("SELECT * FROM page_rate_vote").all()).toEqual([]);
  const rendered = await renderPage(
    '[[module CustomRate key="theme"]]',
    "custom",
    d1 as unknown as D1Database,
  );
  expect(rendered.html).toContain("テーマ適合性");
  expect(rendered.html).toContain("theme");
  const cancelled = await post(4, { type: "cancel" }, ref);
  expect(cancelled.status).toBe(200);
  expect(await cancelled.json()).toMatchObject({ currentVote: null, aggregate: { votes: 0 } });
});
afterEach(() => sqlite.close());

function post(pageId: number, action: unknown, ref: unknown = { kind: "main" }): Promise<Response> {
  return api.request(
    "/rate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_id: pageId, ref, action }),
    },
    { DB: d1 },
  );
}

async function renderText(source: string): Promise<string> {
  const rendered = await renderPage(source, "main", d1 as unknown as D1Database);
  const window = new Window();
  window.document.body.innerHTML = rendered.html;
  const text = window.document.body.textContent;
  await window.happyDOM.close();
  return text;
}

test("ListPages uses the site axis before pagination while displaying independent main and custom aggregates", async () => {
  sqlite.exec(`INSERT INTO site_rating_axes (site_id, axis_key, label, allow_nv)
    VALUES (1, 'theme', 'Theme', 1), (1, 'style', 'Style', 0);
    UPDATE pages SET category = 'entry', rate = 9 WHERE page_id = 4;
    INSERT INTO pages (page_id, category, unix_name, rate) VALUES
      (5, 'entry', 'five', 8), (6, 'entry', 'six', 7), (7, 'entry', 'seven', 6);
    INSERT INTO page_custom_rate_vote (site_id, page_id, axis_key, user_id, rate) VALUES
      (1, 4, 'theme', 1, 1), (1, 4, 'theme', 2, 0),
      (1, 5, 'theme', 1, 1), (1, 5, 'theme', 2, 1),
      (1, 6, 'theme', 1, 1), (1, 6, 'theme', 2, 1),
      (1, 6, 'style', 2, -1);`);
  const text =
    await renderText(`[[module ListPages category="entry" rating-axis="theme" rating=">=1" order="rating desc" per-page="1"]]
ROW:%%name%%:%%rating%%:%%customrate{theme}%%:%%customrate_votes{theme}%%:%%customrate{style}%%:%%customrate{missing}%%:END
[[/module]]`);
  expect(text).toContain("ROW:six:7:2:2:-1::END");
  expect(text).not.toContain("ROW:five");
  const votes =
    await renderText(`[[module ListPages category="entry" rating-axis="theme" votes=">=2" order="rating asc" per-page="1"]]
ROW:%%name%%:%%customrate{theme}%%:%%customrate_percent{theme}%%:END
[[/module]]`);
  expect(votes).toContain("ROW:custom:1:50:END");
  const displayOnly = await renderText(`[[module ListPages category="entry" name="seven"]]
ZERO:%%customrate{theme}%%:%%customrate_votes{theme}%%:%%customrate_percent{theme}%%:END
[[/module]]`);
  expect(displayOnly).toContain("ZERO:0:0:0:END");
  const paged =
    await renderText(`[[module ListPages category="entry" rating-axis="theme" votes=">=2" order="votes desc" per-page="1" offset="1"]]
SELECT:%%name%%:%%customrate{style}%%:%%total%%:END
[[/module]]`);
  expect(paged).toContain("SELECT:five:0:3:END");
});

test("NV persists as zero and cancellation deletes it", async () => {
  const response = await post(1, { type: "vote", value: 0 });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    currentVote: 0,
    aggregate: { points: 0, votes: 1, percent: 0 },
  });
  expect(sqlite.query("SELECT rate FROM page_rate_vote WHERE page_id = 1").get()).toEqual({
    rate: 0,
  });
  const cancelled = await post(1, { type: "cancel" });
  expect(cancelled.status).toBe(200);
  expect(await cancelled.json()).toMatchObject({ currentVote: null, aggregate: { votes: 0 } });
  expect(sqlite.query("SELECT rate FROM page_rate_vote WHERE page_id = 1").get()).toBeNull();
});

test.each([
  [1, 0, 1, [1, -1]],
  [1, 0, 0, [1]],
  [0, 0, 1, [-1]],
  [1, 1, 1, [1, 0, -1]],
  [0, 0, 0, []],
] as const)("axis vote policy %i/%i/%i is enforced by the API", async (uv, nv, dv, allowed) => {
  sqlite
    .query(`INSERT INTO site_rating_axes (site_id, axis_key, label, allow_uv, allow_nv, allow_dv)
    VALUES (1, 'theme', 'Theme', ?, ?, ?)`)
    .run(uv, nv, dv);
  for (const value of [1, 0, -1]) {
    const response = await post(4, { type: "vote", value }, { kind: "custom", axisKey: "theme" });
    expect(response.status).toBe((allowed as readonly number[]).includes(value) ? 200 : 403);
    if (response.ok)
      expect(await response.json()).toMatchObject({
        allowedVotes: allowed,
        aggregate: { votes: 1 },
      });
  }
  const html = (
    await renderPage('[[module CustomRate key="theme"]]', "custom", d1 as unknown as D1Database)
  ).html;
  for (const value of [1, 0, -1]) {
    expect(html.includes(`data-rating-action="${value}"`)).toBe(
      (allowed as readonly number[]).includes(value),
    );
  }
  expect((await post(1, { type: "vote", value: 0 })).status).toBe(200);
});

test("voting, cancellation and aggregate visibility follow the same axis policy on every path", async () => {
  sqlite.exec(`INSERT INTO site_rating_axes (site_id, axis_key, label, can_cancel, show_aggregate)
    VALUES (1, 'theme', 'Theme', 0, 0)`);
  const ref = { kind: "custom", axisKey: "theme" };
  const voted = await post(4, { type: "vote", value: 1 }, ref);
  expect(voted.status).toBe(200);
  expect(await voted.json()).toMatchObject({ aggregate: null, currentVote: 1, canCancel: false });
  expect((await post(4, { type: "cancel" }, ref)).status).toBe(403);
  expect(
    await renderText(
      '[[module ListPages name="custom"]]\nVALUE:%%customrate{theme}%%:END\n[[/module]]',
    ),
  ).toContain("VALUE::END");
  expect(
    await renderText(
      '[[module ListPages rating-axis="theme" order="rating desc"]]\nLEAK\n[[/module]]',
    ),
  ).not.toContain("LEAK");
  const hidden = await renderPage(
    '[[module CustomRate key="theme"]]',
    "custom",
    d1 as unknown as D1Database,
  );
  expect(hidden.html).toContain('data-rating-axis="theme"');
  expect(hidden.html).not.toContain('class="number prw54353"');
  sqlite.exec("UPDATE site_rating_axes SET can_vote = 0, can_cancel = 1");
  expect((await post(4, { type: "vote", value: -1 }, ref)).status).toBe(403);
  const cancelled = await post(4, { type: "cancel" }, ref);
  expect(cancelled.status).toBe(200);
  expect(await cancelled.json()).toMatchObject({
    aggregate: null,
    currentVote: null,
    canVote: false,
  });
  sqlite.exec("UPDATE site_rating_axes SET enabled = 0");
  expect((await post(4, { type: "cancel" }, ref)).status).toBe(403);
  const disabled = await renderPage(
    '[[module CustomRate key="theme"]]',
    "custom",
    d1 as unknown as D1Database,
  );
  expect(disabled.html).not.toContain("page-rate-widget-box");
});

test("axis keys match exactly and never resolve another site's definitions or pages", async () => {
  sqlite.exec(`INSERT INTO site_rating_axes (site_id, axis_key, label) VALUES
    (1, 'Theme', 'Case-sensitive'), (2, 'theme', 'Other site');
    INSERT INTO pages (site_id, page_id, unix_name, source) VALUES
    (2, 50, 'custom', '[[module CustomRate key="theme"]]'),
    (2, 51, 'foreign-only', '[[module CustomRate key="Theme"]]');`);
  const ref = { kind: "custom", axisKey: "theme" };
  expect((await post(4, { type: "vote", value: 1 }, ref)).status).toBe(403);
  expect((await post(50, { type: "vote", value: 1 }, ref)).status).toBe(404);
  expect(
    (await renderPage('[[module CustomRate key="theme"]]', "custom", d1 as unknown as D1Database))
      .html,
  ).not.toContain("page-rate-widget-box");
  expect(
    await renderText('[[module ListPages rating-axis="theme"]]\nLEAK\n[[/module]]'),
  ).not.toContain("LEAK");
  expect(
    await renderText('[[module ListPages category="*"]]\nPAGE:%%name%%\n[[/module]]'),
  ).not.toContain("foreign-only");
  expect(
    (await renderPage("[[include foreign-only]]", "main", d1 as unknown as D1Database)).html,
  ).not.toContain("page-rate-widget-box");
  expect(() =>
    sqlite.exec(`INSERT INTO page_custom_rate_vote (site_id, page_id, axis_key, user_id, rate)
    VALUES (2, 4, 'theme', 2, 1)`),
  ).toThrow("FOREIGN KEY");
});

test("registered but undeclared axes, attributes and generated modules do not authorize voting", async () => {
  sqlite.exec(
    "INSERT INTO site_rating_axes (site_id, axis_key, label) VALUES (1, 'theme', 'Theme')",
  );
  const ref = { kind: "custom", axisKey: "theme" };
  for (const source of [
    '[[module CustomRate key="Theme"]]',
    '[[module CustomRate key="theme" page="custom"]]',
    '[[module ListPages]]\n[[module CustomRate key="theme"]]\n[[/module]]',
    "[[module ListPages]]\n[[include custom]]\n[[/module]]",
    '@@[[module CustomRate key="theme"]]@@',
  ]) {
    sqlite.query("UPDATE pages SET source = ? WHERE page_id = 3").run(source);
    expect((await post(3, { type: "vote", value: 1 }, ref)).status).toBe(403);
  }
  expect(sqlite.query("SELECT * FROM page_custom_rate_vote").all()).toEqual([]);
});

test("page and axis deletion clean up custom votes without changing unrelated ratings", async () => {
  sqlite.exec(`INSERT INTO site_rating_axes (site_id, axis_key, label) VALUES (1, 'theme', 'Theme');
    INSERT INTO page_custom_rate_vote (site_id, page_id, axis_key, user_id, rate) VALUES
      (1, 4, 'theme', 2, 1), (1, 3, 'theme', 2, -1);
    INSERT INTO page_rate_vote (page_id, user_id, rate) VALUES (1, 2, 1), (4, 2, -1);
    INSERT INTO page_tags (page_id, tag) VALUES (4, 'tag');`);
  await deletePage(d1 as unknown as D1Database, 4);
  expect(sqlite.query("SELECT page_id FROM page_custom_rate_vote").all()).toEqual([{ page_id: 3 }]);
  expect(sqlite.query("SELECT page_id FROM page_rate_vote").all()).toEqual([{ page_id: 1 }]);
  sqlite.exec("DELETE FROM site_rating_axes WHERE site_id = 1 AND axis_key = 'theme'");
  expect(sqlite.query("SELECT * FROM page_custom_rate_vote").all()).toEqual([]);
  expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
});

test("more than 100 registered keys are resolved in one page and ListPages without bind overflow", async () => {
  const keys = Array.from({ length: 120 }, (_, i) => `axis-${i}`);
  keys.push("constructor", "__proto__", "日本語");
  for (const key of keys)
    sqlite
      .query("INSERT INTO site_rating_axes (site_id, axis_key, label) VALUES (1, ?, ?)")
      .run(key, key);
  const source = keys.map((key) => `[[module CustomRate key="${key}"]]`).join("\n");
  const rendered = await renderPage(source, "custom", d1 as unknown as D1Database);
  expect(rendered.html.match(/data-rating-kind="custom"/g)?.length).toBe(123);
  const text = await renderText(
    `[[module ListPages name="custom"]]\n${keys.map((key, i) => `KEY${i}:%%customrate{${key}}%%:END`).join("\n")}\n[[/module]]`,
  );
  for (let i = 0; i < keys.length; i++) expect(text).toContain(`KEY${i}:0:END`);
});

test("the additive migration preserves existing pages, tags and main votes", async () => {
  const legacy = new Database(":memory:");
  try {
    legacy.exec("PRAGMA foreign_keys = ON");
    for (const migration of ["0001_schema.sql", "0002_page_lock.sql"]) {
      legacy.exec(await Bun.file(`examples/wdmock-cf/migrations/${migration}`).text());
    }
    legacy.exec(`INSERT INTO pages (page_id, unix_name, source, rate, is_locked) VALUES (1, 'old', 'Original source', -1, 1);
      INSERT INTO page_tags VALUES (1, 'tag');
      INSERT INTO page_rate_vote (page_id, user_id, rate) VALUES (1, 2, -1);`);
    legacy.exec(await Bun.file("examples/wdmock-cf/migrations/0003_custom_rating.sql").text());
    expect(legacy.query("SELECT source, rate, is_locked FROM pages").get()).toEqual({
      source: "Original source",
      rate: -1,
      is_locked: 1,
    });
    expect(legacy.query("SELECT tag FROM page_tags").get()).toEqual({ tag: "tag" });
    expect(legacy.query("SELECT rate FROM page_rate_vote").get()).toEqual({ rate: -1 });
    expect(legacy.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    legacy.close();
  }
});

test("included Rate votes on its display page and absent or custom declarations cannot become main", async () => {
  expect((await post(2, { type: "vote", value: 1 })).status).toBe(200);
  expect(sqlite.query("SELECT page_id, rate FROM page_rate_vote").all()).toEqual([
    { page_id: 2, rate: 1 },
  ]);
  expect((await post(3, { type: "vote", value: 1 })).status).toBe(403);
  expect((await post(4, { type: "vote", value: 1 })).status).toBe(403);
  expect(
    (await post(4, { type: "vote", value: 1 }, { kind: "custom", axisKey: "theme" })).status,
  ).toBe(403);
  expect((await post(99, { type: "vote", value: 1 })).status).toBe(404);
  expect((await post(1, { type: "vote", value: 2 })).status).toBe(400);
});
