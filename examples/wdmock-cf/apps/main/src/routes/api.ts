/**
 * API routes for page operations
 */
import { Hono } from "hono";
import { processWikitext } from "@wdprlib/parser";
import type { RatingAction } from "@wdprlib/runtime";
import type { Bindings } from "@wdmock/shared";
import { parseFullname, buildFullname, SITE } from "@wdmock/shared";
import {
  findPage,
  createPage,
  updatePage,
  deletePage as deletePageFromDb,
  upsertVote,
  deleteVote,
  recalculatePageRate,
  getTagsByFullname,
} from "@wdmock/db";
import { renderPage, deletePageBlocks, getIncludeSource } from "../services/pipeline";
import { readMainRating } from "../services/ratings";

const api = new Hono<{ Bindings: Bindings }>();

// Health check
api.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Rate a page
api.post("/rate", async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body || typeof body !== "object") return c.json({ error: "Invalid request" }, 400);
  const { page_id, ref, action } = body;
  const userId = 2; // Fixed: user

  if (
    typeof page_id !== "number" ||
    !Number.isSafeInteger(page_id) ||
    page_id <= 0 ||
    !ref ||
    typeof ref !== "object" ||
    !("kind" in ref) ||
    ref.kind !== "main"
  ) {
    return c.json({ error: "Invalid request" }, 400);
  }
  const ratingAction = readRatingAction(action);
  if (!ratingAction) return c.json({ error: "Invalid action" }, 400);

  const db = c.env.DB;
  const page = await db
    .prepare("SELECT category, unix_name, source FROM pages WHERE page_id = ?")
    .bind(page_id)
    .first<{ category: string; unix_name: string; source: string }>();
  if (!page) return c.json({ error: "Page not found" }, 404);
  let declared = false;
  await processWikitext(page.source, {
    page: {
      fullName: buildFullname(page.category, page.unix_name),
      tags: await getTagsByFullname(db, page.category, page.unix_name),
      site: SITE.name,
    },
    dataProvider: {
      fetchInclude: (reference) => getIncludeSource(db, reference),
      fetchRatings: async (refs) => {
        declared = refs.some((reference) => reference.kind === "main");
        return [];
      },
    },
  });
  if (!declared) return c.json({ error: "Rating is not available on this page" }, 403);

  if (ratingAction.type === "cancel") {
    await deleteVote(db, userId, page_id);
  } else {
    await upsertVote(db, userId, page_id, ratingAction.value);
  }

  await recalculatePageRate(db, page_id);
  return c.json(await readMainRating(db, page_id));
});

function readRatingAction(action: unknown): RatingAction | null {
  if (!action || typeof action !== "object" || !("type" in action)) return null;
  if (action.type === "cancel") return { type: "cancel" };
  if (
    action.type === "vote" &&
    "value" in action &&
    (action.value === -1 || action.value === 0 || action.value === 1)
  )
    return { type: "vote", value: action.value };
  return null;
}

// Get rendered page HTML
api.get("/page/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/page\/?/, "");
  const { category, name } = parseFullname(path);
  const db = c.env.DB;

  const page = await findPage(db, category, name);
  if (!page) {
    return c.json({ error: "Page not found" }, 404);
  }

  const fullname = buildFullname(category, name);
  const { html, styles } = await renderPage(page.source, fullname, db, {
    files: c.env.FILES,
    filesBaseUrl: c.env.FILES_BASE_URL,
    urlPath: `/${path}`,
  });

  return c.json({
    page_id: page.page_id,
    title: page.title,
    fullname,
    html,
    styles,
  });
});

// Get page source for editing
api.get("/page-source/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/page-source\/?/, "");
  const { category, name } = parseFullname(path);
  const db = c.env.DB;

  const page = await findPage(db, category, name);
  if (!page) {
    return c.json({ error: "Page not found" }, 404);
  }

  return c.json({
    page_id: page.page_id,
    title: page.title,
    source: page.source,
  });
});

// Create or update a page
api.put("/page/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/page\/?/, "");
  const { category, name } = parseFullname(path);
  const db = c.env.DB;

  const body = await c.req.json<{ title: string; source: string }>();
  if (!body.title && !body.source && body.source !== "") {
    return c.json({ error: "title or source required" }, 400);
  }

  const existing = await findPage(db, category, name);
  const fullname = buildFullname(category, name);

  if (existing) {
    if (existing.is_locked) {
      return c.json({ error: "Page is locked" }, 403);
    }

    await updatePage(db, existing.page_id, body.title, body.source);
    await deletePageBlocks(c.env.FILES, fullname);

    const { html, styles } = await renderPage(body.source, fullname, db, {
      files: c.env.FILES,
      filesBaseUrl: c.env.FILES_BASE_URL,
    });

    return c.json({
      page_id: existing.page_id,
      title: body.title,
      fullname,
      html,
      styles,
    });
  }

  const pageId = await createPage(db, category, name, body.title, body.source);

  const { html, styles } = await renderPage(body.source, fullname, db, {
    files: c.env.FILES,
    filesBaseUrl: c.env.FILES_BASE_URL,
  });

  return c.json({ page_id: pageId, title: body.title, fullname, html, styles }, 201);
});

// Delete a page
api.delete("/page/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/page\/?/, "");
  const { category, name } = parseFullname(path);
  const db = c.env.DB;

  const page = await findPage(db, category, name);
  if (!page) {
    return c.json({ error: "Page not found" }, 404);
  }

  if (page.is_locked) {
    return c.json({ error: "Page is locked" }, 403);
  }

  const fullname = buildFullname(category, name);
  await deletePageBlocks(c.env.FILES, fullname);
  await deletePageFromDb(db, page.page_id);

  return c.json({ ok: true });
});

// Get sidebar HTML
api.get("/sidebar", async (c) => {
  const db = c.env.DB;

  const page = await findPage(db, "nav", "side");
  if (!page) {
    return c.json({ html: "", styles: [] });
  }

  const { html, styles } = await renderPage(page.source, "nav:side", db, {
    files: c.env.FILES,
    filesBaseUrl: c.env.FILES_BASE_URL,
  });
  return c.json({ html, styles });
});

// Get topbar HTML
api.get("/topbar", async (c) => {
  const db = c.env.DB;

  const page = await findPage(db, "nav", "top");
  if (!page) {
    return c.json({ html: "", styles: [] });
  }

  const { html, styles } = await renderPage(page.source, "nav:top", db, {
    files: c.env.FILES,
    filesBaseUrl: c.env.FILES_BASE_URL,
  });
  return c.json({ html, styles });
});

export { api };
