const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  renderToHtml,
  renderWikitext,
  renderMessages,
  DEFAULT_SETTINGS,
} = require("@wdprlib/render");

assert.match(require.resolve("@wdprlib/render"), /[/\\]dist[/\\]index\.cjs$/);
const fixture = join(__dirname, "../unit/render/fixtures/i18n");
const ast = JSON.parse(readFileSync(join(fixture, "expected.json"), "utf8"));
const catalog = JSON.parse(readFileSync(join(fixture, "messages.ja.json"), "utf8"));

assert.equal(renderToHtml(ast), readFileSync(join(fixture, "output.html"), "utf8").trim());
assert.equal(renderMessages["toc.title"], "Table of Contents");
const options = { i18n: { locale: "ja", messages: catalog } };
const html = renderToHtml(ast, options);
assert.ok(html.includes('<div class="title">目次</div>'));
assert.ok(
  html.includes('<a href="/wdpr-i18n-missing-page-20260906/edit/true">ページを作成する</a>'),
);

renderWikitext({ ast, settings: DEFAULT_SETTINGS, page: { fullName: "test", tags: [] } }, options)
  .then((result) => {
    assert.equal(result.html, html);
    console.log("CommonJS renderer: passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
