import { Hono } from "hono";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { decompile } from "@wdprlib/decompiler";

const app = new Hono();

app.post("/api/wikidot", async (c) => {
  const { source } = await c.req.json<{ source: string }>();
  try {
    const { ast } = parse(source);
    const html = renderToHtml(ast, { footnotes: ast.footnotes });
    const decompiled = decompile(html);
    return c.json({ html, decompiled, ast });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return c.json({ error: message }, 400);
  }
});

app.post("/api/html", async (c) => {
  const { html } = await c.req.json<{ html: string }>();
  try {
    const decompiled = decompile(html);
    const { ast } = parse(decompiled);
    const preview = renderToHtml(ast, { footnotes: ast.footnotes });
    return c.json({ preview, decompiled, ast });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return c.json({ error: message }, 400);
  }
});

export default app;
