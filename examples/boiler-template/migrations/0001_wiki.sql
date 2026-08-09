PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  wikidot_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unix_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE pages (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  unix_name TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  updated_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 0,
  rating_votes INTEGER NOT NULL DEFAULT 0,
  revision_count INTEGER NOT NULL DEFAULT 1,
  comments_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (category, unix_name)
);

CREATE TABLE page_tags (
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (page_id, tag)
);

CREATE INDEX pages_created_at_idx ON pages(created_at);
CREATE INDEX pages_updated_at_idx ON pages(updated_at);
CREATE INDEX pages_title_idx ON pages(title);
CREATE INDEX page_tags_page_id_idx ON page_tags(page_id);
CREATE INDEX page_tags_tag_idx ON page_tags(tag);

INSERT INTO users (id, wikidot_id, name, unix_name, created_at) VALUES
  (1, 1, 'user', 'user', '2026-06-01T09:00:00.000Z');

INSERT INTO pages (
  id, category, unix_name, title, source, created_by, updated_by, created_at, updated_at,
  rating, rating_votes, revision_count, comments_count
) VALUES
  (1, '_default', 'home', 'WDPR on Cloudflare Workers', '[[toc]]

[[include component:features]]

++ Pages

[[module ListPages category="docs" order="created_at desc" limit="5"]]
* %%title_linked%% — %%created_at|%Y-%m-%d%% by %%created_by%%
[[div class="list-pages-example"]]
%%title%% is loaded from D1.
[[/div]]
[[/module]]

++ User

[[module ListUsers users="."]]
[[div class="list-users-example"]]
Current user: %%name%%
[[/div]]
[[/module]]

++ Tags

[[module TagCloud limit="10"]]

++ HTML block

[[html]]<button type="button" data-message="HTML block works" onclick="this.textContent = this.dataset.message">Try HTML block</button>[[/html]]

[[include component:note]]

Existing page: [[[docs:intro]]]

Missing page: [[[missing-page]]]

[[module CSS]]
.list-pages-example { border-inline-start: 3px solid #901; padding-inline-start: 0.75rem; }
.list-users-example { color: #600; }
[[/module]]', 1, 1, '2026-06-01T09:30:00.000Z', '2026-08-08T12:00:00.000Z', 12, 6, 3, 0),
  (2, '_default', 'about', 'このサイトについて', 'このboilerは、D1に保存したWikidot記法をWDPRで展開し、完成したHTML documentを返します。', 1, 1, '2026-06-02T10:00:00.000Z', '2026-06-02T10:00:00.000Z', 2, 2, 1, 0),
  (3, '_default', 'playground', 'Playground', 'このページもmigrationでseedされています。

[[user user]]', 1, 1, '2026-06-03T11:00:00.000Z', '2026-07-01T09:15:00.000Z', 1, 1, 2, 0),
  (4, 'docs', 'intro', 'はじめに', '{{bun install}}の後に{{bun run db:migrate:local}}と{{bun run dev}}を実行します。', 1, 1, '2026-06-10T09:00:00.000Z', '2026-06-10T09:00:00.000Z', 4, 3, 1, 0),
  (5, 'docs', 'pipeline', 'Pipeline adapters', 'ListPages、ListUsers、TagCloud、includeは、必要な構文があるときだけD1 adapterを呼び出します。', 1, 1, '2026-06-11T09:00:00.000Z', '2026-07-04T14:00:00.000Z', 5, 4, 2, 0),
  (6, 'component', 'features', 'Features component', 'この段落はD1の{{component:features}}からincludeされています。', 1, 1, '2026-06-01T09:10:00.000Z', '2026-06-01T09:10:00.000Z', 0, 0, 1, 0),
  (7, 'component', 'note', 'Note component', '> Nested include follows.

[[include component:note-body]]', 1, 1, '2026-06-01T09:11:00.000Z', '2026-06-01T09:11:00.000Z', 0, 0, 1, 0),
  (8, 'component', 'note-body', 'Note body component', 'The include resolver follows transitive dependencies.[[footnote]]This footnote is defined in an included component.[[/footnote]]', 1, 1, '2026-06-01T09:12:00.000Z', '2026-06-01T09:12:00.000Z', 0, 0, 1, 0),
  (9, 'nav', 'side', 'Side navigation', '[[div class="side-block"]]
* [[[home | ホーム]]]
* [[[about | このサイトについて]]]
* [[[docs:intro | はじめに]]]
[[/div]]', 1, 1, '2026-06-01T09:05:00.000Z', '2026-06-01T09:05:00.000Z', 0, 0, 1, 0),
  (10, 'nav', 'top', 'Top navigation', '* [[[home | ホーム]]]
* [[[docs:intro | ドキュメント]]]
* [[[playground | Playground]]]', 1, 1, '2026-06-01T09:06:00.000Z', '2026-06-01T09:06:00.000Z', 0, 0, 1, 0);

INSERT INTO page_tags (page_id, tag) VALUES
  (1, 'example'), (1, 'workers'),
  (2, 'example'),
  (3, 'example'), (3, 'playground'),
  (4, 'docs'), (4, 'example'),
  (5, 'docs'), (5, 'pipeline');
