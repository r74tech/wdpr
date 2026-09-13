import { describe, expect, test } from "bun:test";
import type { RatingRef, RatingState } from "@wdprlib/ast";
import {
  definePageData,
  extractDataRequirements,
  parse,
  processWikitext,
  resolveModules,
} from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { Window } from "happy-dom";

const page = { fullName: "story:displayed", tags: [], tenant: "test" };
const main: RatingRef = { kind: "main" };
const custom: RatingRef = { kind: "custom", axisKey: "Contest-2026" };
const state = (ref: RatingRef): RatingState => ({
  ref,
  label: "評価 <&>",
  allowedVotes: [1, 0, -1],
  canVote: true,
  canCancel: true,
  currentVote: 0,
  aggregate: { points: 3, votes: 5, percent: 60 },
});

describe("registered page ratings", () => {
  test("unresolved, invalid and unknown ratings do not render or fall back to main", async () => {
    const source =
      '[[module Rate]]\n[[module CustomRate key="missing"]]\n[[module CustomRate key=""]]\n[[module Rate page="other"]]\n[[module Rate allowedVotes="1"]]';
    expect(renderToHtml(parse(source).ast)).not.toContain("page-rate-widget-box");
    const requests: RatingRef[][] = [];
    const document = await processWikitext(source, {
      page,
      dataProvider: {
        fetchRatings: async (refs) => {
          requests.push([...refs]);
          return [state(custom)];
        },
      },
    });
    expect(requests).toEqual([[main, { kind: "custom", axisKey: "missing" }]]);
    expect(renderToHtml(document.ast)).not.toContain("page-rate-widget-box");
  });

  test("includes retain the display page, exact keys, and a single fetch per reference", async () => {
    const requests: RatingRef[][] = [];
    const document = await processWikitext(
      '[[module Rate]]\n[[include component]]\n[[module CustomRate key="Contest-2026"]]',
      {
        page,
        dataProvider: {
          fetchInclude: async (ref, context) => {
            expect(context.page).toEqual(page);
            return ref.page === "component"
              ? "[[include nested]]"
              : '[[module CustomRate key="Contest-2026"]]\n[[module CustomRate key="contest-2026"]]';
          },
          fetchRatings: async (refs, context) => {
            expect(context.page).toEqual(page);
            requests.push([...refs]);
            return [state(custom)];
          },
        },
      },
    );
    expect(requests).toEqual([[main, custom, { kind: "custom", axisKey: "contest-2026" }]]);
    const html = renderToHtml(document.ast);
    expect(html.match(/class="page-rate-widget-box"/g)).toHaveLength(2);
    expect(html).toContain('data-rating-axis="Contest-2026"');
    expect(html).not.toContain("data-page-id");
    expect(html).toContain("Ø");
    expect(html).toContain("×");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("評価 &lt;&amp;&gt;");
    expect(html).not.toContain('class="vote-count"');
    expect(html).not.toContain('class="rate-percent"');
    const window = new Window();
    window.document.body.innerHTML = html;
    const widget = window.document.querySelector(".page-rate-widget-box")!;
    expect(widget.querySelector(":scope > .rate-points")?.textContent).toBe("評価 <&>:\u00a0+3");
    expect(widget.querySelectorAll(":scope > span > a[data-rating-action]")).toHaveLength(4);
    expect(widget.querySelector(".rateup > a[data-rating-action='1']")).not.toBeNull();
    expect(widget.querySelector(".ratedown > a[data-rating-action='-1']")).not.toBeNull();
    expect(widget.querySelector(".rateneutral > a[data-rating-action='0']")).not.toBeNull();
    expect(widget.querySelector(".cancel > a[data-rating-action='cancel']")).not.toBeNull();
    expect(widget.querySelector("button, .rate-actions, .rate-summary")).toBeNull();
    await window.happyDOM.close();
  });

  test.each(["pipeline", "resolver"])(
    "%s suppresses Rate from module templates and their includes",
    async (mode) => {
      const source =
        "[[module Rate]]\n[[module ListPages]]\n[[include component]]\n%%content%%\n[[/module]]";
      const content =
        '[[module CustomRate key="Contest-2026"]]\n[[footnote]][[module Rate]][[/footnote]]';
      const data = {
        pages: [
          definePageData({
            fullname: "another",
            title: "Other",
            createdAt: new Date(0),
            updatedAt: new Date(0),
            tags: [],
            content,
          }),
        ],
        totalCount: 1,
        site: { name: "test", title: "Test", domain: "test.invalid" },
      };
      const requests: RatingRef[][] = [];
      const fetchRatings = async (refs: readonly RatingRef[]) => {
        requests.push([...refs]);
        return [state(main), state(custom)];
      };
      const ast = parse(source).ast;
      const resolved =
        mode === "pipeline"
          ? (
              await processWikitext(source, {
                page,
                dataProvider: {
                  fetchListPages: async () => data,
                  fetchInclude: async () => content,
                  fetchRatings,
                },
              })
            ).ast
          : await resolveModules(
              ast,
              { fetchListPages: async () => data, fetchInclude: () => content, fetchRatings },
              { ...extractDataRequirements(ast), parse },
            );
      expect(requests).toEqual([[main]]);
      expect(renderToHtml(resolved).match(/class="page-rate-widget-box"/g)).toHaveLength(1);
    },
  );

  test.each([[1], [-1], [1, -1], [1, 0, -1], []])(
    "renders only host-permitted vote types: %j",
    async (...values) => {
      const allowedVotes = values as (-1 | 0 | 1)[];
      const document = await processWikitext("[[module Rate]]", {
        page,
        dataProvider: {
          fetchRatings: async () => [
            { ...state(main), allowedVotes, canCancel: false, aggregate: null },
          ],
        },
      });
      const html = renderToHtml(document.ast);
      for (const value of [-1, 0, 1])
        expect(html.includes(`data-rating-action="${value}"`)).toBe(
          allowedVotes.includes(value as -1 | 0 | 1),
        );
      expect(html).not.toContain('data-rating-action="cancel"');
      expect(html).not.toContain('class="number');
    },
  );
});
