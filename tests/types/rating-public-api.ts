import type { RatingRef, RatingState } from "@wdprlib/ast";
import type {
  RatingRef as RuntimeRatingRef,
  RatingState as RuntimeRatingState,
  RatingAction,
} from "../../packages/runtime/src/rating";
import type { DataProvider } from "@wdprlib/parser";

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
  const provider: DataProvider = { fetchRatings: async () => [state] };
  const action: RatingAction = { type: "vote", value: 0 };
  void [forward, backward, a, b, provider, action];
}
