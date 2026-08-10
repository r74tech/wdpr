# WDPR Workers wiki starter

WDPR、Cloudflare Workers、D1、R2で作る小さなWikidot互換サイトです。

ページ、include、ナビゲーション、ユーザー、タグ、日時はD1に保存します。ページURLへアクセスすると、main WorkerがWikidot記法を展開したHTML documentを直接返します。HTML blockは別originのfiles WorkerがR2から配信します。ブラウザ側のJavaScriptはWDPR runtimeの初期化だけを担当します。

## ローカル起動

リポジトリルートで依存packageをinstallした後、次のコマンドを実行します。

```bash
bun install
cd examples/boiler-template
bun run db:migrate:local
bun run dev
```

`bun run dev`はmain Workerとfiles Workerを同時に起動します。

D1とR2のローカルデータは`.wrangler/state`に保存されます。Cloudflare accountは不要です。

確認用コマンドは次のとおりです。

```bash
bun run typecheck
bun run test
bun run build
```

## データを変更する

初期schemaとサンプルデータは`migrations/0001_wiki.sql`にあります。

- `pages`: fullnameを構成するcategoryとunix name、title、source、日時、評価値
- `users`: ListUsersとpage author
- `page_tags`: pageとtagの対応

`nav:side`と`nav:top`も通常のpage rowです。`component:*`のpageは`[[include]]`から読み込みます。

サンプルの`home`はListPages、ListUsers、TagCloud、推移的include、TOC、footnote、CSS module、R2へ保存するHTML blockを含みます。

CSS moduleは現在のWDPRでは安全側に既定無効です。このstarterは編集画面を持たず、D1へ管理者が保存したpageだけを扱うため、`wiki.ts`で明示的に有効化しています。利用者がpageを編集できる機能を追加する場合は、その権限境界に合わせて設定を見直してください。

## Workerの構成

- `src/worker/data.ts`: D1 rowをWDPRのPageDataとprovider resultへ変換
- `src/worker/wiki.ts`: `processWikitext()`と`renderWikitext()`を接続
- `src/worker/document.ts`: Wikidot DOMのHTML documentを生成
- `src/worker/index.ts`: page GETを配信
- `src/files-worker.ts`: 別originでHTML blockをR2から配信し、runtimeのWorker向けsubpathを利用
- `src/main.ts`: 完成済みDOMへWDPR runtimeを初期化

WDPRは、該当する構文が存在するときだけinclude、ListPages、ListUsers、TagCloudのproviderを呼びます。page linkがない場合、page-existence adapterもD1へqueryしません。

ListPages adapterはstarterを短く保つため、categoryとtagsをWDPRの共通selectorでメモリ上評価し、最大20件を返します。ページ数が増えて計測上の問題が出たら、`data.ts`の候補取得を利用するDBに合わせて絞り込んでください。

## Deploy

1. D1 databaseとR2 bucketを作成します。
2. 表示されたD1 database IDを`wrangler.jsonc`へ設定します。
3. `wrangler.jsonc`の`HTML_BLOCK_ORIGIN`と`wrangler.files.jsonc`のorigin設定を本番URLへ変更します。
4. migrationをremoteへ適用し、2つのWorkerをdeployします。

```bash
bunx wrangler d1 create wdpr-boiler-db
bunx wrangler r2 bucket create wdpr-boiler-html-blocks
bun run cf-typegen
bun run db:migrate:remote
bun run deploy:files
bun run deploy
```

HTML blockはpage fullnameとSHA-256をkeyとしてR2へ保存し、iframeへ`allow-scripts`だけを許可します。files Workerをmain Workerと同じcustom domainへrouteしないでください。
