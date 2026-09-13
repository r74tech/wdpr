import type { RatingRef, RatingState, RatingVote } from "@wdprlib/parser";
import { SITE } from "@wdmock/shared";

interface RatingAxis {
  axis_key: string;
  label: string;
  uv_label: string;
  nv_label: string;
  dv_label: string;
  allow_uv: number;
  allow_nv: number;
  allow_dv: number;
  can_vote: number;
  can_cancel: number;
  show_aggregate: number;
}

export async function readRatingAxes(
  db: D1Database,
  keys: readonly string[],
): Promise<RatingAxis[]> {
  if (keys.length === 0) return [];
  const result = await db
    .prepare(
      `SELECT axis_key, label, uv_label, nv_label, dv_label,
              allow_uv, allow_nv, allow_dv, can_vote, can_cancel, show_aggregate
       FROM site_rating_axes WHERE site_id = ? AND enabled = 1
         AND axis_key IN (SELECT value FROM json_each(?))`,
    )
    .bind(SITE.id, JSON.stringify(keys))
    .all<RatingAxis>();
  return result.results;
}

export async function readCustomRatings(
  db: D1Database,
  pageIds: readonly number[],
  axes: readonly RatingAxis[],
): Promise<Map<number, RatingState[]>> {
  const states = new Map<number, RatingState[]>();
  if (pageIds.length === 0 || axes.length === 0) return states;
  const result = await db
    .prepare(
      `SELECT pages.page_id, axes.axis_key, COALESCE(SUM(v.rate), 0) AS points,
              COUNT(v.rate) AS votes, COALESCE(SUM(v.rate = 1), 0) AS positive,
              MAX(CASE WHEN v.user_id = 2 THEN v.rate ELSE NULL END) AS current_vote
       FROM pages CROSS JOIN site_rating_axes axes
       LEFT JOIN page_custom_rate_vote v
         ON v.site_id = pages.site_id AND v.page_id = pages.page_id AND v.axis_key = axes.axis_key
       WHERE pages.site_id = ? AND axes.site_id = pages.site_id AND axes.enabled = 1
         AND pages.page_id IN (SELECT value FROM json_each(?))
         AND axes.axis_key IN (SELECT value FROM json_each(?))
       GROUP BY pages.page_id, axes.axis_key`,
    )
    .bind(SITE.id, JSON.stringify(pageIds), JSON.stringify(axes.map((axis) => axis.axis_key)))
    .all<{
      page_id: number;
      axis_key: string;
      points: number;
      votes: number;
      positive: number;
      current_vote: RatingVote | null;
    }>();
  const axesByKey = new Map(axes.map((axis) => [axis.axis_key, axis]));
  for (const row of result.results) {
    const axis = axesByKey.get(row.axis_key)!;
    const allowedVotes: RatingVote[] = [];
    if (axis.allow_uv) allowedVotes.push(1);
    if (axis.allow_nv) allowedVotes.push(0);
    if (axis.allow_dv) allowedVotes.push(-1);
    const state: RatingState = {
      ref: { kind: "custom", axisKey: row.axis_key },
      label: axis.label,
      voteLabels: { 1: axis.uv_label, 0: axis.nv_label, [-1]: axis.dv_label },
      allowedVotes,
      canVote: axis.can_vote === 1,
      canCancel: axis.can_cancel === 1,
      currentVote: row.current_vote,
      aggregate:
        axis.show_aggregate === 1
          ? {
              points: row.points,
              votes: row.votes,
              percent: row.votes === 0 ? 0 : Math.round((row.positive / row.votes) * 100),
            }
          : null,
    };
    const pageStates = states.get(row.page_id) ?? [];
    pageStates.push(state);
    states.set(row.page_id, pageStates);
  }
  return states;
}

export async function readPageRatings(
  db: D1Database,
  pageId: number,
  refs: readonly RatingRef[],
): Promise<RatingState[]> {
  const keys = refs.flatMap((ref) => (ref.kind === "custom" ? [ref.axisKey] : []));
  const axes = await readRatingAxes(db, keys);
  const states = (await readCustomRatings(db, [pageId], axes)).get(pageId) ?? [];
  if (refs.some((ref) => ref.kind === "main")) states.unshift(await readMainRating(db, pageId));
  return states;
}

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
