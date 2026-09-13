import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { processWikitext } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { initRate } from "../../src/modules/rate";
import type { RatingAction, RatingRef, RatingState } from "../../src/types";

const main: RatingRef = { kind: "main" };
const custom: RatingRef = { kind: "custom", axisKey: "theme-A" };
function state(ref: RatingRef, currentVote: -1 | 0 | 1 | null = null): RatingState {
  return {
    ref,
    label: "Rating",
    allowedVotes: [1, 0, -1],
    canVote: true,
    canCancel: true,
    currentVote,
    aggregate: { points: 5, votes: 10, percent: 50 },
  };
}

describe("modules/rate", () => {
  let root: HTMLElement;
  beforeEach(async () => {
    const window = new Window();
    const document = window.document as unknown as Document;
    root = document.createElement("div");
    const result = await processWikitext(
      '[[module Rate]]\n[[module Rate]]\n[[module CustomRate key="theme-A"]]',
      {
        page: { fullName: "displayed", tags: [] },
        dataProvider: { fetchRatings: async () => [state(main), state(custom)] },
      },
    );
    root.innerHTML = renderToHtml(result.ast);
    document.body.appendChild(root);
  });

  const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  function click(value: string, index = 0): void {
    root.querySelectorAll<HTMLElement>(`[data-rating-action="${value}"]`)[index]!.click();
  }

  test.each([main, custom])("provider labels follow complete state updates: %j", async (ref) => {
    const source =
      ref.kind === "main" ? "[[module Rate]]" : `[[module CustomRate key="${ref.axisKey}"]]`;
    const result = await processWikitext(`${source}\n${source}`, {
      page: { fullName: "displayed", tags: [] },
      dataProvider: {
        fetchRatings: async () => [
          {
            ...state(ref),
            voteLabels: { 1: "▲", 0: "■", [-1]: "▼" },
          },
        ],
      },
    });
    root.innerHTML = renderToHtml(result.ast);
    const labels = () =>
      [...root.querySelectorAll("a[data-rating-action]")].map((control) => control.textContent);
    expect(labels()).toEqual(["▲", "■", "▼", "×", "▲", "■", "▼", "×"]);
    expect(root.querySelector('[data-rating-action="0"]')?.getAttribute("aria-label")).toBe(
      "Neutral vote",
    );

    const calls: { ref: RatingRef; action: RatingAction }[] = [];
    const cleanup = initRate(root, {
      onRate: async (ref, action) => {
        calls.push({ ref, action });
        return action.type === "vote"
          ? { ...state(ref, action.value), voteLabels: { 0: "□" } }
          : state(ref);
      },
    });
    click("0");
    await settle();
    expect(calls).toEqual([{ ref, action: { type: "vote", value: 0 } }]);
    expect(labels()).toEqual(["+", "□", "–", "×", "+", "□", "–", "×"]);
    click("cancel", 1);
    await settle();
    expect(calls[1]).toEqual({ ref, action: { type: "cancel" } });
    expect(labels()).toEqual(["+", "Ø", "–", "×", "+", "Ø", "–", "×"]);
    cleanup.destroy();
  });

  test("neutral is a vote, cancellation is distinct, and duplicate widgets synchronize", async () => {
    expect(root.querySelectorAll(".vote-count, .rate-percent")).toHaveLength(0);
    const calls: { ref: RatingRef; action: RatingAction }[] = [];
    const cleanup = initRate(root, {
      onRate: async (ref, action) => {
        calls.push({ ref, action });
        return {
          ...state(ref, action.type === "vote" ? action.value : null),
          aggregate: { points: 7, votes: 12, percent: 60 },
        };
      },
    });
    click("0");
    await settle();
    expect(calls).toEqual([{ ref: main, action: { type: "vote", value: 0 } }]);
    expect([...root.querySelectorAll(".rate-points .number")].map((el) => el.textContent)).toEqual([
      "+7",
      "+7",
      "+5",
    ]);
    expect(root.querySelectorAll('[data-rating-action="0"][aria-pressed="true"]')).toHaveLength(2);
    click("cancel", 1);
    await settle();
    expect(calls[1]).toEqual({ ref: main, action: { type: "cancel" } });
    expect(root.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    click("1", 2);
    await settle();
    expect(root.querySelectorAll(".vote-count, .rate-percent")).toHaveLength(0);
    expect(
      [...root.querySelectorAll(".page-rate-widget-box > .rate-points")].map(
        (element) => element.textContent,
      ),
    ).toEqual(["Rating:\u00a0+7", "Rating:\u00a0+7", "Rating:\u00a0+7"]);
    expect(
      root.querySelectorAll(".page-rate-widget-box > span > a[data-rating-action]"),
    ).toHaveLength(12);
    cleanup.destroy();
  });

  test("pending is per reference and failures allow retry without changing the score", async () => {
    let rejectRequest: (reason?: unknown) => void = () => {};
    const calls: RatingRef[] = [];
    const cleanup = initRate(root, {
      onRate: (ref) => {
        calls.push(ref);
        if (ref.kind === "custom") return Promise.resolve(state(ref, -1));
        return new Promise((_resolve, reject) => {
          rejectRequest = reject;
        });
      },
    });
    click("1");
    click("-1", 1);
    click("-1", 2);
    expect(calls).toEqual([main, custom]);
    rejectRequest(new Error("network failed"));
    await settle();
    expect(root.querySelectorAll('[aria-busy="true"]')).toHaveLength(0);
    expect(root.querySelector(".rate-points .number")?.textContent).toBe("+5");
    expect(root.querySelector('[role="status"]')?.textContent).not.toBe("");
    click("1");
    expect(calls).toHaveLength(3);
    cleanup.destroy();
    rejectRequest(new Error("cancelled test"));
    await settle();
  });

  test("server can withdraw visibility, and destroy ignores outstanding results", async () => {
    let resolveRequest: (state: RatingState | null) => void = () => {};
    const cleanup = initRate(root, {
      onRate: () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    });
    click("1");
    resolveRequest(null);
    await settle();
    expect(root.querySelectorAll(".page-rate-widget-box")).toHaveLength(1);
    click("1");
    cleanup.destroy();
    const html = root.innerHTML;
    resolveRequest(state(custom, 1));
    await settle();
    expect(root.innerHTML).toBe(html);
  });

  test("synchronous callback errors are handled and do not leave controls pending", async () => {
    const cleanup = initRate(root, {
      onRate: () => {
        throw new Error("offline");
      },
    });
    click("1");
    await settle();
    expect(root.querySelectorAll('[aria-busy="true"]')).toHaveLength(0);
    expect(root.querySelector('[role="status"]')?.textContent).not.toBe("");
    cleanup.destroy();
  });

  test("preserves keyboard focus without stealing it after the user moves elsewhere", async () => {
    let resolveRequest: (state: RatingState) => void = () => {};
    const cleanup = initRate(root, {
      onRate: () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    });
    const neutral = root.querySelector<HTMLAnchorElement>('[data-rating-action="0"]')!;
    neutral.focus();
    neutral.click();
    expect(root.ownerDocument.activeElement).toBe(root.querySelector(".page-rate-widget-box"));
    resolveRequest(state(main, 0));
    await settle();
    expect(root.ownerDocument.activeElement).toBe(root.querySelector('[data-rating-action="0"]'));

    click("0");
    const customButton = root.querySelector<HTMLAnchorElement>('[data-rating-kind="custom"] a')!;
    customButton.focus();
    resolveRequest(state(main, 0));
    await settle();
    expect(root.ownerDocument.activeElement).toBe(customButton);
    cleanup.destroy();
  });

  test("Space activates styled anchors and disabled controls cannot submit", async () => {
    const calls: RatingAction[] = [];
    const cleanup = initRate(root, {
      onRate: async (ref, action) => {
        calls.push(action);
        return { ...state(ref, 0), canVote: false };
      },
    });
    const control = root.querySelector<HTMLAnchorElement>('[data-rating-action="0"]')!;
    control.dispatchEvent(
      new root.ownerDocument.defaultView!.KeyboardEvent("keydown", {
        key: " ",
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle();
    expect(calls).toEqual([{ type: "vote", value: 0 }]);
    const disabled = root.querySelector<HTMLAnchorElement>('[data-rating-action="0"]')!;
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    expect(disabled.tabIndex).toBe(-1);
    disabled.click();
    await settle();
    expect(calls).toHaveLength(1);
    expect(root.querySelector('[data-rating-action="cancel"]')?.getAttribute("aria-disabled")).toBe(
      "false",
    );
    cleanup.destroy();
  });
});
