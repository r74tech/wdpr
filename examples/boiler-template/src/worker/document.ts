import type { WikitextRenderResult } from "@wdprlib/render";
import type { ProcessedWikitextDocument } from "@wdprlib/parser";
import type { WikiPage } from "./data";

interface WikiDocument {
  page: WikiPage;
  content: WikitextRenderResult<ProcessedWikitextDocument>;
  sideBar: WikitextRenderResult<ProcessedWikitextDocument>;
  topBar: WikitextRenderResult<ProcessedWikitextDocument>;
  scriptPath: string;
}

export function renderDocument(document: WikiDocument): string {
  const { page, content, sideBar, topBar } = document;
  const styles = [...sideBar.styles, ...topBar.styles, ...content.styles]
    .join("\n")
    .replace(/<\/style/gi, "<\\/style");
  const tags = page.tags
    .map(
      (tag) => `<a href="/system:page-tags/tag/${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`,
    )
    .join(" ");

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} - WDPR Boiler</title>
  <link rel="stylesheet" href="/style.css">
  ${styles === "" ? "" : `<style id="wdpr-page-styles">${styles}</style>`}
</head>
<body id="html-body">
<div id="skrollr-body">
  <a id="page-top"></a>
  <div id="container-wrap-wrap"><div id="container-wrap"><div id="container">
    <div id="header">
      <h1><a href="/"><span>WDPR Boiler</span></a></h1>
      <h2><span>SCP-JP Sigma on Cloudflare Workers</span></h2>
      <div id="search-top-box"></div>
      <div id="top-bar">${topBar.html}</div>
      <div id="login-status"><span class="printuser">user</span></div>
      <div id="header-extra-div-1"><span></span></div><div id="header-extra-div-2"><span></span></div><div id="header-extra-div-3"><span></span></div>
    </div>
    <div id="content-wrap">
      <div id="side-bar">${sideBar.html}</div>
      <div id="main-content">
        <div id="action-area-top"></div>
        <div id="page-title">${escapeHtml(page.title)}</div>
        <div id="page-content">${content.html}</div>
        <div id="page-tags"><span>${tags}</span></div>
        <div id="page-info-break"></div>
        <div id="page-options-container"><div id="page-info">最終更新: ${escapeHtml(page.updatedAt.toISOString())}</div><div id="page-options-bottom" class="page-options-bottom"></div></div>
        <div id="page-options-area-bottom"></div><div id="action-area"></div>
      </div>
    </div>
    <div id="footer">Powered by WDPR and Cloudflare Workers</div>
    <div id="license-area"></div>
  </div></div></div>
  <div id="extrac-div-1"><span></span></div><div id="extrac-div-2"><span></span></div><div id="extrac-div-3"><span></span></div>
</div>
<div id="extra-div-1"><span></span></div><div id="extra-div-2"><span></span></div><div id="extra-div-3"><span></span></div><div id="extra-div-4"><span></span></div><div id="extra-div-5"><span></span></div><div id="extra-div-6"><span></span></div>
<script type="module" src="${escapeHtml(document.scriptPath)}"></script>
</body>
</html>`;
}

export function renderErrorDocument(message: string, scriptPath: string): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>エラー - WDPR Boiler</title><link rel="stylesheet" href="/style.css"></head><body id="html-body"><div id="container-wrap-wrap"><div id="container-wrap"><div id="container"><div id="header"><h1><a href="/"><span>WDPR Boiler</span></a></h1></div><div id="content-wrap"><div id="main-content"><div id="page-title">エラー</div><div id="page-content"><p>${escapeHtml(message)}</p></div></div></div></div></div></div><script type="module" src="${escapeHtml(scriptPath)}"></script></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
