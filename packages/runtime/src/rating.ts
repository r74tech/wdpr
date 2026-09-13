/** Structural DOM contract; runtime remains independent of the parser and AST packages. */
export type RatingRef = { kind: "main" } | { kind: "custom"; axisKey: string };
export type RatingVote = -1 | 0 | 1;
export type RatingAction = { type: "vote"; value: RatingVote } | { type: "cancel" };
export interface RatingAggregate {
  points: number;
  votes: number;
  percent: number;
}
export interface RatingState {
  ref: RatingRef;
  label: string;
  /** Plain-text vote labels. Omitted entries in each complete state use + / Ø / –. */
  voteLabels?: Readonly<Partial<Record<RatingVote, string>>>;
  allowedVotes: readonly RatingVote[];
  canVote: boolean;
  canCancel: boolean;
  currentVote: RatingVote | null;
  aggregate: RatingAggregate | null;
}
