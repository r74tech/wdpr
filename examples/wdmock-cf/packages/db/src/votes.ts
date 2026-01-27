/**
 * Votes table operations
 */

export interface RateResult {
  points: number;
  votes: number;
  percent: number;
}

export async function upsertVote(
  db: D1Database,
  userId: number,
  pageId: number,
  points: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO page_rate_vote (user_id, page_id, rate)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, page_id) DO UPDATE SET rate = ?, date = datetime('now')`,
    )
    .bind(userId, pageId, points, points)
    .run();
}

export async function deleteVote(db: D1Database, userId: number, pageId: number): Promise<void> {
  await db
    .prepare("DELETE FROM page_rate_vote WHERE user_id = ? AND page_id = ?")
    .bind(userId, pageId)
    .run();
}

export async function recalculatePageRate(db: D1Database, pageId: number): Promise<RateResult> {
  const result = await db
    .prepare(
      "SELECT COALESCE(SUM(rate), 0) as total, COUNT(*) as votes FROM page_rate_vote WHERE page_id = ?",
    )
    .bind(pageId)
    .first<{ total: number; votes: number }>();

  const total = result?.total ?? 0;
  const votes = result?.votes ?? 0;

  await db.prepare("UPDATE pages SET rate = ? WHERE page_id = ?").bind(total, pageId).run();

  return {
    points: total,
    votes,
    percent: votes > 0 ? Math.round(((total + votes) / (2 * votes)) * 100) : 0,
  };
}
