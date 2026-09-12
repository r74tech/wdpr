import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database, type SQLQueryBindings } from "bun:sqlite";
import { api } from "../../../examples/wdmock-cf/apps/main/src/routes/api";

let sqlite: Database;
const d1 = {
  prepare(sql: string) {
    function statement(values: SQLQueryBindings[] = []) {
      return {
        bind: (...parameters: SQLQueryBindings[]) => statement(parameters),
        first: async () => sqlite.query(sql).get(...values),
        all: async () => ({ results: sqlite.query(sql).all(...values) }),
        run: async () => {
          sqlite.query(sql).run(...values);
          return { success: true };
        },
      };
    }
    return statement();
  },
};

beforeEach(async () => {
  sqlite = new Database(":memory:");
  sqlite.exec(await Bun.file("examples/wdmock-cf/migrations/0001_schema.sql").text());
  sqlite.exec(await Bun.file("examples/wdmock-cf/migrations/0002_page_lock.sql").text());
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

test("included Rate votes on its display page and absent or custom declarations cannot become main", async () => {
  expect((await post(2, { type: "vote", value: 1 })).status).toBe(200);
  expect(sqlite.query("SELECT page_id, rate FROM page_rate_vote").all()).toEqual([
    { page_id: 2, rate: 1 },
  ]);
  expect((await post(3, { type: "vote", value: 1 })).status).toBe(403);
  expect((await post(4, { type: "vote", value: 1 })).status).toBe(403);
  expect(
    (await post(4, { type: "vote", value: 1 }, { kind: "custom", axisKey: "theme" })).status,
  ).toBe(400);
  expect((await post(99, { type: "vote", value: 1 })).status).toBe(404);
  expect((await post(1, { type: "vote", value: 2 })).status).toBe(400);
});
