/**
 * Votes table operations
 */

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

export async function recalculatePageRate(db: D1Database, pageId: number): Promise<void> {
  await db
    .prepare(
      "UPDATE pages SET rate = (SELECT COALESCE(SUM(rate), 0) FROM page_rate_vote WHERE page_id = ?) WHERE page_id = ?",
    )
    .bind(pageId, pageId)
    .run();
}
