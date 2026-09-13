import { describe, expect, test } from "bun:test";
import {
  definePageData,
  extractDataRequirements,
  normalizeQuery,
  parse,
  processWikitext,
  resolveModules,
} from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { Window } from "happy-dom";

const base = definePageData({
  fullname: "story:one",
  title: "One",
  tags: [],
  createdAt: new Date(0),
  updatedAt: new Date(0),
});
const site = { name: "test", title: "Test", domain: "test.invalid" };

describe("ListPages registered values", () => {
  test("requests exact metadata and rating keys and normalizes both comment orders", () => {
    const source =
      '[[module ListPages rating-axis="Contest-A" rating=">=0" order="metadata{tags.UpdatedAt} asc"]]\n%%metadata{tags.UpdatedAt}|%Y%% %%metadata{tags.updated_by}%% %%customrate{Contest-A}%% %%customrate_votes{Contest-B}%%\n[[/module]]';
    const requirement = extractDataRequirements(parse(source).ast).requirements.listPages[0]!;
    expect(requirement.metadataKeys).toEqual(["tags.UpdatedAt", "tags.updated_by"]);
    expect(requirement.customRateKeys).toEqual(["Contest-A", "Contest-B"]);
    expect(normalizeQuery(requirement.query)).toMatchObject({
      ratingAxis: "Contest-A",
      rating: { op: ">=", value: 0 },
      order: { field: "metadata", key: "tags.UpdatedAt", direction: "asc" },
    });
    expect(normalizeQuery({ order: "comments desc" }).order).toEqual({
      field: "comments",
      direction: "desc",
    });
    expect(normalizeQuery({ order: "commented_at asc" }).order).toEqual({
      field: "commented_at",
      direction: "asc",
    });
    expect(normalizeQuery({ ratingAxis: "", order: "votes desc" }).ratingAxis).toBe("");
  });

  test.each(["pipeline", "resolver"])(
    "%s renders registered values as literals before include expansion",
    async (mode) => {
      const value = '[[include secret]] [[module Rate]] >@ @@ **本文** <script> ".';
      const source =
        "[[module ListPages]]\n%%metadata{tags.updated_by}%% / %%metadata{zero}%% / %%metadata{when}|%Y%% / %%metadata{constructor}%%\n%%customrate{Contest-A}%%:%%customrate_votes{Contest-A}%%:%%customrate_percent{Contest-A}%%\n%%customrate{Missing}%%\n[[/module]]";
      const page = {
        ...base,
        metadata: {
          "tags.updated_by": { type: "text", value },
          zero: { type: "number", value: 0 },
          when: { type: "date", value: new Date("2026-09-12T00:00:00Z") },
        },
        customRates: { "Contest-A": { points: 0, votes: 2, percent: 0 } },
      };
      let includeCalls = 0;
      const data = { pages: [page], totalCount: 1, site };
      const ast = parse(source).ast;
      const resolved =
        mode === "pipeline"
          ? (
              await processWikitext(source, {
                page: { fullName: "index", tags: [] },
                dataProvider: {
                  fetchListPages: async () => data,
                  fetchInclude: async () => {
                    includeCalls++;
                    return "LEAK";
                  },
                },
              })
            ).ast
          : await resolveModules(
              ast,
              {
                fetchListPages: async () => data,
                fetchInclude: () => {
                  includeCalls++;
                  return "LEAK";
                },
              },
              { ...extractDataRequirements(ast), parse },
            );
      const html = renderToHtml(resolved);
      const dom = new Window().document;
      dom.body.innerHTML = html;
      expect(includeCalls).toBe(0);
      expect(dom.body.textContent).toContain(value);
      expect(dom.body.textContent).toContain("0 / 2026 /");
      expect(html).toContain("0:2:0");
      expect(html).not.toContain("[object Object]");
      expect(html).not.toContain("page-rate-widget-box");
      expect(html).not.toContain("<script>");
    },
  );

  test("passes URL-selected rating axes without normalizing their case", async () => {
    let received: unknown;
    const source =
      '[[module ListPages rating-axis="@URL" order="votes desc" per-page="1"]]\n%%customrate{A}%%\n[[/module]]';
    await processWikitext(source, {
      page: { fullName: "index", tags: [], urlPath: "/index/rating-axis/A-B" },
      dataProvider: {
        fetchListPages: async (query) => {
          received = query;
          return { pages: [], totalCount: 0, site };
        },
      },
    });
    expect(received).toMatchObject({
      ratingAxis: "A-B",
      order: { field: "votes", direction: "desc" },
      limit: 1,
    });
  });
});
