import { Hono } from "hono";
import { findPage } from "./data";
import { renderDocument, renderErrorDocument } from "./document";
import { renderPage } from "./wiki";

const app = new Hono<{ Bindings: Cloudflare.Env }>();
const scriptPath = import.meta.env.DEV ? "/src/main.ts" : "/assets/main.js";

app.get("*", async (context) => {
  const fullName = pageName(new URL(context.req.url).pathname);
  const page = fullName === null ? null : await findPage(context.env.DB, fullName);
  if (page === null) {
    return context.html(renderErrorDocument("ページが見つかりません。", scriptPath), 404);
  }

  const dependencies = {
    db: context.env.DB,
    htmlBlocks: context.env.HTML_BLOCKS,
    origin: new URL(context.req.url).origin,
    htmlBlockOrigin: context.env.HTML_BLOCK_ORIGIN,
  };
  const [content, sideBarPage, topBarPage] = await Promise.all([
    renderPage(page, dependencies),
    findPage(context.env.DB, "nav:side"),
    findPage(context.env.DB, "nav:top"),
  ]);
  if (sideBarPage === null || topBarPage === null) throw new Error("Navigation pages are missing");
  const [sideBar, topBar] = await Promise.all([
    renderPage(sideBarPage, dependencies),
    renderPage(topBarPage, dependencies),
  ]);

  return context.html(renderDocument({ page, content, sideBar, topBar, scriptPath }));
});

app.onError((error, context) => {
  console.error(JSON.stringify({ message: "Wikitext rendering failed", error: error.message }));
  return context.html(renderErrorDocument("ページを表示できませんでした。", scriptPath), 500);
});

function pageName(pathname: string): string | null {
  try {
    const decoded = decodeURIComponent(pathname.replace(/^\//, ""));
    return decoded === "" ? "home" : decoded;
  } catch {
    return null;
  }
}

export default app;
