import type { RatingRef, RatingState } from "@wdprlib/ast";
import type {
  RatingRef as RuntimeRatingRef,
  RatingState as RuntimeRatingState,
  RatingAction,
} from "../../packages/runtime/src/rating";
import type { DataProvider, PageData, PageMetadataValue } from "@wdprlib/parser";

/** Runtime's independent structural contract must match the AST/provider contract in both directions. */
export function checkRatingContracts(
  ref: RatingRef,
  state: RatingState,
  runtimeRef: RuntimeRatingRef,
  runtimeState: RuntimeRatingState,
): void {
  const forward: RuntimeRatingState = state;
  const backward: RatingState = runtimeState;
  const a: RuntimeRatingRef = ref;
  const b: RatingRef = runtimeRef;
  const labeled: RatingState = { ...state, voteLabels: { 1: "▲", 0: "■", [-1]: "▼" } };
  const labelsForward: RuntimeRatingState["voteLabels"] = labeled.voteLabels;
  const labelsBackward: RatingState["voteLabels"] = runtimeState.voteLabels;
  const provider: DataProvider = { fetchRatings: async () => [labeled] };
  const action: RatingAction = { type: "vote", value: 0 };
  const metadata: PageMetadataValue = { type: "number", value: 0 };
  const values: Pick<PageData, "metadata" | "customRates"> = {
    metadata: { zero: metadata },
    customRates: { theme: { points: 0, votes: 1, percent: 0 } },
  };
  void [forward, backward, labelsForward, labelsBackward, a, b, provider, action, values];
}
