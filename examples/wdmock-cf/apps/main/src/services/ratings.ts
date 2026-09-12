import type { RatingState } from "@wdprlib/parser";

/** Demo policy: the fixed mock user may cast UV/NV/DV on the main rating. */
export async function readMainRating(db: D1Database, pageId: number): Promise<RatingState> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(rate), 0) AS points, COUNT(*) AS votes,
            COALESCE(SUM(CASE WHEN rate = 1 THEN 1 ELSE 0 END), 0) AS positive,
            MAX(CASE WHEN user_id = 2 THEN rate ELSE NULL END) AS current_vote
     FROM page_rate_vote WHERE page_id = ?`,
    )
    .bind(pageId)
    .first<{ points: number; votes: number; positive: number; current_vote: -1 | 0 | 1 | null }>();
  const votes = row?.votes ?? 0;
  return {
    ref: { kind: "main" },
    label: "rating",
    allowedVotes: [1, 0, -1],
    canVote: true,
    canCancel: true,
    currentVote: row?.current_vote ?? null,
    aggregate: {
      points: row?.points ?? 0,
      votes,
      percent: votes === 0 ? 0 : Math.round((row!.positive / votes) * 100),
    },
  };
}
