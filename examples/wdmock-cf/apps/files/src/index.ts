/**
 * Files Worker - Serves code/html block content from R2
 *
 * Runs on a separate domain to isolate user-generated content
 * from the main application for security.
 *
 * URL patterns (compatible with Wikidot's wdfiles.com):
 * - /local--html/<page>/<hash>  - HTML block content
 * - /local--code/<page>/<index> - Code block content
 * - /common--javascript/html-block-iframe.js - Resize script for iframe
 */

import { HTML_BLOCK_RESIZE_SCRIPT } from "@wdprlib/runtime";

interface Env {
  FILES: R2Bucket;
  ALLOWED_ORIGIN?: string;
}

const HTML_BLOCK_CSS_URL = "https://wdpr-demo-v1.r74.tech/common--theme/base/css/html-block.css";

const HTML_WRAPPER_TEMPLATE = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html id="html-block-html" xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
<meta http-equiv="Content-type" content="text/html; charset=utf-8"/>
<link rel="stylesheet" href="${HTML_BLOCK_CSS_URL}"/>
</head>
<body></body>
</html>`;

function addResizeScript(content: string): Response {
  const hasBody = /<body[\s>]/i.test(content);

  if (hasBody) {
    const response = new Response(content, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

    return new HTMLRewriter()
      .on("body", {
        element(element) {
          element.append(
            '<script type="text/javascript" src="/common--javascript/html-block-iframe.js"></script>',
            { html: true },
          );
        },
      })
      .transform(response);
  }

  const templateResponse = new Response(HTML_WRAPPER_TEMPLATE, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  return new HTMLRewriter()
    .on("body", {
      element(element) {
        element.append(content, { html: true });
        element.append(
          '<script type="text/javascript" src="/common--javascript/html-block-iframe.js"></script>',
          { html: true },
        );
      },
    })
    .transform(templateResponse);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Serve resize script
    if (path === "/common--javascript/html-block-iframe.js") {
      return new Response(HTML_BLOCK_RESIZE_SCRIPT, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const htmlMatch = path.match(/^\/local--html\/([^/]+)\/([^/]+)$/);
    const codeMatch = path.match(/^\/local--code\/([^/]+)\/([^/]+)$/);

    let key: string;
    let contentType: string;
    let securityHeaders: Record<string, string> = {};

    if (htmlMatch) {
      const [, page, hash] = htmlMatch;
      key = `local--html/${page}/${hash}`;
      contentType = "text/html; charset=utf-8";
      securityHeaders = {
        "X-Content-Type-Options": "nosniff",
      };
    } else if (codeMatch) {
      const [, page, index] = codeMatch;
      key = `local--code/${page}/${index}`;
      contentType = "text/plain; charset=utf-8";
      securityHeaders = {
        "X-Content-Type-Options": "nosniff",
      };
    } else {
      return new Response("Not found", { status: 404 });
    }

    const object = await env.FILES.get(key);
    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers({
      ...corsHeaders,
      ...securityHeaders,
      "Content-Type": object.httpMetadata?.contentType || contentType,
      ETag: object.httpEtag,
      "Cache-Control": "public, max-age=31536000, immutable",
    });

    if (request.method === "HEAD") {
      return new Response(null, { headers });
    }

    if (htmlMatch) {
      const rawContent = await object.text();
      const transformed = addResizeScript(rawContent);
      const newHeaders = new Headers(transformed.headers);
      for (const [key, value] of headers.entries()) {
        newHeaders.set(key, value);
      }
      return new Response(transformed.body, { headers: newHeaders });
    }

    return new Response(object.body, { headers });
  },
};
