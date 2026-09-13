/** A rating always belongs to the host's displayed page. */
export type RatingRef = { kind: "main" } | { kind: "custom"; axisKey: string };

/** Zero is a neutral vote, not a cancellation. */
export type RatingVote = -1 | 0 | 1;

/** Aggregates and the treatment of neutral votes are computed by the host. */
export interface RatingAggregate {
  points: number;
  votes: number;
  percent: number;
}

/** An authorized, registered rating supplied by the host for the current viewer. */
export interface RatingState {
  ref: RatingRef;
  label: string;
  /** Plain-text vote labels, e.g. { 1: "+", 0: "φ", [-1]: "-" }. Omitted entries use + / Ø / –. */
  voteLabels?: Readonly<Partial<Record<RatingVote, string>>>;
  /** Host policy: e.g. [1, -1], [1], [-1], or [1, 0, -1]. */
  allowedVotes: readonly RatingVote[];
  /** False keeps a visible, read-only widget. Omit the state to hide it entirely. */
  canVote: boolean;
  /** Independent of permission to cast a vote. */
  canCancel: boolean;
  /** Null means no vote; zero is a saved neutral vote. */
  currentVote: RatingVote | null;
  /** Null hides all aggregate values without preventing voting. */
  aggregate: RatingAggregate | null;
}

/** `[[module Rate]]` accepts no attributes. A null reference marks an invalid declaration. */
export interface RateModuleData {
  module: "rate";
  ref: Extract<RatingRef, { kind: "main" }> | null;
  state?: RatingState;
}

/** `[[module CustomRate key="theme"]]` accepts only key; it never registers or changes policy. */
export interface CustomRateModuleData {
  module: "custom-rate";
  ref: Extract<RatingRef, { kind: "custom" }> | null;
  state?: RatingState;
}
