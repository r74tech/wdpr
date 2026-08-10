import { HTML_BLOCK_RESIZE_SCRIPT } from "@wdprlib/runtime/html-block-script";

export interface FilesEnv {
  HTML_BLOCKS: R2Bucket;
  ALLOWED_ORIGIN: string;
  HTML_BLOCK_CSS_URL: string;
}

const worker = {
  async fetch(request: Request, env: FilesEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/common--javascript/html-block-iframe.js") {
      return new Response(HTML_BLOCK_RESIZE_SCRIPT, {
        headers: {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      });
    }

    const match = /^\/local--html\/([^/]+)\/([a-f0-9]{64})$/.exec(url.pathname);
    if (request.method !== "GET" || match === null)
      return new Response("Not found", { status: 404 });
    const page = decodeURIComponent(match[1]!);
    const hash = match[2]!;
    const object = await env.HTML_BLOCKS.get(`local--html/${page}/${hash}`);
    if (object === null) return new Response("Not found", { status: 404 });

    const source = await object.text();
    const html = /<body[\s>]/i.test(source)
      ? source
      : `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html id="html-block-html" xmlns="http://www.w3.org/1999/xhtml" xml:lang="ja" lang="ja"><head><meta http-equiv="Content-type" content="text/html; charset=utf-8"/><link rel="stylesheet" href="${escapeAttribute(env.HTML_BLOCK_CSS_URL)}"/></head><body>${source}</body></html>`;
    const response = new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    const transformed = new HTMLRewriter()
      .on("body", {
        element(element) {
          element.append(
            '<script type="text/javascript" src="/common--javascript/html-block-iframe.js"></script>',
            { html: true },
          );
        },
      })
      .transform(response);
    const headers = new Headers(transformed.headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Content-Security-Policy", `frame-ancestors ${env.ALLOWED_ORIGIN}`);
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(transformed.body, { headers });
  },
};

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

export default worker;
