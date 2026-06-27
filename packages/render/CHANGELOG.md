## 3.0.1 (2026-06-27)

This was a version bump only for @wdprlib/render to align it with other projects, there were no code changes.

# 3.0.0 (2026-06-27)

### ♻️ Refactors

- **parser/render:** parser/renderを機能単位のfolder layoutに整理 ([#52](https://github.com/r74tech/wdpr/pull/52))
- **render:** context、escape、elements、module renderer、highlighter engineを責務ごとのfolderに分割 ([#52](https://github.com/r74tech/wdpr/pull/52))

### ❤️ Thank You

- r74tech @r74tech

## 2.1.0 (2026-06-10)

### 🚀 Features

- **parser/ast:** opener-embedded [[#if]] / [[#expr]] / [[#ifexpr]] と [[iftags]] bare prefix 対応 ([#50](https://github.com/r74tech/wdpr/pull/50))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 2.1.0

### ❤️ Thank You

- r74tech @r74tech

# 2.0.0 (2026-06-04)

### 🚀 Features

- ⚠️  **ast, parser, render:** `WikitextSettings.allowHtmlBlocks`を追加し`[[html]]`ブロックを context 別に無効化可能に ([#46](https://github.com/r74tech/wdpr/pull/46))

### 🩹 Fixes

- **render:** style属性内のurl()を安全なschemeで許可 ([#40](https://github.com/r74tech/wdpr/pull/40))

### ⚠️  Breaking Changes

- **ast, parser, render:** `WikitextSettings.allowHtmlBlocks`を追加し`[[html]]`ブロックを context 別に無効化可能に  ([#46](https://github.com/r74tech/wdpr/pull/46))
  WikitextSettings に必須プロパティ allowHtmlBlocks が
  追加された。手書きで WikitextSettings を構築している消費者は
  allowHtmlBlocks フィールドの追加が必要。createSettings(mode) を経由
  していれば影響なし。
  * feat(parser)!: allowHtmlBlocks=false で [[html]] を黙って消費
  opener の `]]` を検証してから settings.allowHtmlBlocks === false を判定。
  disabled 時はブロック全体を消費して空要素 (success:true / elements:[]) を
  返し、ctx.htmlBlocks には push しない。close が見つからない場合も EOF まで
  消費して同じく空要素を返す (unclosed-block warning + html-block-disabled
  info の両方を emit)。中身が text として漏れない。
  malformed opener (closing `]]` 欠落) は従来どおり success:false で
  fallback する。enabled 時の挙動は完全維持。
  BREAKING CHANGE: WikitextSettings.allowHtmlBlocks が false の context
  では [[html]] が AST にも html-blocks 配列にも出ない。
  * feat(render)!: allowHtmlBlocks=false で html element を出力しない
  renderHtmlBlock の先頭で ctx.settings.allowHtmlBlocks === false を判定し
  早期 return。nextHtmlBlockIndex() の counter advance や htmlBlockUrl
  resolver 呼び出しより前に置くことで、disabled-but-still-in-AST な
  ブロック (手組み AST、キャッシュ AST、別 parser 由来) でも何も出力しない。
  これによりパース側で settings ゲートが効かないパス (例: 手組み AST の
  直接 render) でも enforcement boundary が保てる。
  BREAKING CHANGE: WikitextSettings.allowHtmlBlocks が false の context
  では html element をレンダしない (空)。
  * test: allowHtmlBlocks の parser/render 両側のテスト追加
  parser (tests/unit/parser/settings.test.ts):
  - createSettings 既定値 (page=true / draft, forum-post, direct-message=false)
  - enabled (page): [[html]] が html element になり html-blocks に push される
  - disabled (draft): element 出ず html-blocks 空、html-block-disabled diagnostic、本文に漏れない
  - disabled + unclosed: EOF まで consume、unclosed-block + html-block-disabled 両方 emit、漏れない
  - disabled + 周囲非干渉: 前後の paragraph は残る
  - forum-post / direct-message でも disabled になる
  render (tests/unit/render/settings.test.ts):
  - enabled: iframe が出る
  - disabled: 手組み AST に html element があっても iframe 出ない (enforcement boundary)
  - disabled: htmlBlockUrl resolver が呼ばれない
  * fix(parser): allowHtmlBlocks=false での leak と close-detection を強化
  3 件の漏れ・誤検出を修正:
  1. (High) close-detection の修正
     parseBlockName で名前が "html" と一致した時点で foundClose=true に
     していたため、malformed `[[/html no-close` (BLOCK_CLOSE 欠落) で close
     と誤認識し、後続テキストが leak する可能性があった。BLOCK_CLOSE まで
     reach できることを確認してから close と認める実装に変更 (whitespace は
     許容)。これにより disabled 時の unclosed パスも常に EOF まで consume
     する。
  2. (Medium) text-level の [[html]] strip pre-pass を追加
     block-rule の gate だけでは段落内 `before [[html]]X[[/html]] after`
     のような inline-position occurrence を捕まえられない (block dispatcher
     が mid-paragraph トークンに到達しない)。Wikidot 互換の非貪欲 regex で
     parse 開始時に text-level で strip し、両ポジションで漏れない設計に変更。
     parse() に `stripDisabledHtmlBlocks` を追加。
  3. (Low) disabled 時の contents 累積をスキップ
     disabled では body を破棄するため、token.value を contents に積む処理
     をガード。大きな入力でのメモリ/CPU を節約。
  test: 段落内 inline 漏れ防止 + malformed close 漏れ防止 のケースを追加。
  * refactor(parser): allowHtmlBlocks gate を inline rule で実装 (text-level pre-pass 廃止)
  text-level pre-pass の問題点を洗い直して再設計:
  1. (High) Parser class 直接使用で pre-pass がバイパスされる
  2. (High) closed のみ strip、mid-paragraph unclosed が漏れる
  3. (Medium) text-level pre-pass が [[code]]/[[html]] 等 raw 内も削除
  4. (Medium) strip 後の lex で diagnostic 位置がずれる
  5. (Medium) pre-pass の gate が truthiness、rule/render は === false
  → text-level pre-pass を廃止し、inline html rule 追加で再設計:
  - packages/parser/src/parser/preprocess/strip-disabled-html.ts 削除
  - parse() を元に戻す
  - packages/parser/src/parser/rules/inline/html.ts (新規 htmlInlineRule):
    - allowHtmlBlocks !== false: success:false (従来挙動維持)
    - === false: [[html]]...[[/html]] を inline で消費、空要素返す
    - close-detection は BLOCK_CLOSE まで verify (whitespace 許容)
    - unclosed: NEWLINE+NEWLINE (blank line) で停止 (後続 paragraph 保護)
  - block rule にも同じ blank-line 停止を追加
  - inline rules 配列に登録 (commentRule の直後)
  これで5件すべて解消:
  1. rule 自体が parse 時に走るので Parser 直接使用でも gate される
  2. inline rule が mid-paragraph closed/unclosed 両方扱う
  3. [[code]]/[[html]] 内は block rule で raw 扱いされ inline rule は到達しない
  4. source mutation なしで位置情報そのまま
  5. すべて === false に統一
  test 追加: Parser 直接使用 / blank-line で stop / code 内 [[html]] 保護
  * fix(parser): enabled html block の空行誤認 + close 末尾 whitespace 漏れを修正
  2 件のバグを修正:
  1. (High) blank-line stop が enabled でも効き、空行を含む valid [[html]]
     block が page mode で壊れる。例: [[html]]\n<p>one</p>\n\n<p>two</p>\n[[/html]]
     → blank-line stop を disabled 時のみに限定。
  2. (Medium) close detection は [[/html ]] (whitespace before ]]) を
     許容するが、close 消費側が whitespace を skip しておらず ]] が paragraph
     text に漏れていた。close 消費側にも whitespace skip を追加。
  test: 空行入り valid html block / whitespace 付き close tag のケース追加。
  * fix(parser): disabled でも closed [[html]] の body 内空行で漏れていた問題を修正
  disabled mode で blank-line stop が close より先に発火し、空行を含む
  closed [[html]] (例: [[html]]\n<p>one</p>\n\n<p>two</p>\n[[/html]]) の
  後半 <p>two</p> と [[/html]] が paragraph text に漏れていた。
  修正: 事前の forward lookahead で real close 存在を確認する
  lookaheadHasHtmlClose ヘルパを追加し、close が ahead に存在する場合は
  blank-line stop を抑止。close 不在 (truly unclosed) の時のみ blank-line
  stop が効く。block rule / inline rule 両方に適用。
  regression test: disabled mode で空行入り closed block が完全に消費される
  ことを確認。

### ❤️ Thank You

- r74tech @r74tech

## 1.4.1 (2026-06-04)

### 🚀 Features

- ⚠️  **ast, parser, render:** `WikitextSettings.allowHtmlBlocks`を追加し`[[html]]`ブロックを context 別に無効化可能に ([#46](https://github.com/r74tech/wdpr/pull/46))

### 🩹 Fixes

- **render:** style属性内のurl()を安全なschemeで許可 ([#40](https://github.com/r74tech/wdpr/pull/40))

### ⚠️  Breaking Changes

- **ast, parser, render:** `WikitextSettings.allowHtmlBlocks`を追加し`[[html]]`ブロックを context 別に無効化可能に  ([#46](https://github.com/r74tech/wdpr/pull/46))
  WikitextSettings に必須プロパティ allowHtmlBlocks が
  追加された。手書きで WikitextSettings を構築している消費者は
  allowHtmlBlocks フィールドの追加が必要。createSettings(mode) を経由
  していれば影響なし。
  * feat(parser)!: allowHtmlBlocks=false で [[html]] を黙って消費
  opener の `]]` を検証してから settings.allowHtmlBlocks === false を判定。
  disabled 時はブロック全体を消費して空要素 (success:true / elements:[]) を
  返し、ctx.htmlBlocks には push しない。close が見つからない場合も EOF まで
  消費して同じく空要素を返す (unclosed-block warning + html-block-disabled
  info の両方を emit)。中身が text として漏れない。
  malformed opener (closing `]]` 欠落) は従来どおり success:false で
  fallback する。enabled 時の挙動は完全維持。
  BREAKING CHANGE: WikitextSettings.allowHtmlBlocks が false の context
  では [[html]] が AST にも html-blocks 配列にも出ない。
  * feat(render)!: allowHtmlBlocks=false で html element を出力しない
  renderHtmlBlock の先頭で ctx.settings.allowHtmlBlocks === false を判定し
  早期 return。nextHtmlBlockIndex() の counter advance や htmlBlockUrl
  resolver 呼び出しより前に置くことで、disabled-but-still-in-AST な
  ブロック (手組み AST、キャッシュ AST、別 parser 由来) でも何も出力しない。
  これによりパース側で settings ゲートが効かないパス (例: 手組み AST の
  直接 render) でも enforcement boundary が保てる。
  BREAKING CHANGE: WikitextSettings.allowHtmlBlocks が false の context
  では html element をレンダしない (空)。
  * test: allowHtmlBlocks の parser/render 両側のテスト追加
  parser (tests/unit/parser/settings.test.ts):
  - createSettings 既定値 (page=true / draft, forum-post, direct-message=false)
  - enabled (page): [[html]] が html element になり html-blocks に push される
  - disabled (draft): element 出ず html-blocks 空、html-block-disabled diagnostic、本文に漏れない
  - disabled + unclosed: EOF まで consume、unclosed-block + html-block-disabled 両方 emit、漏れない
  - disabled + 周囲非干渉: 前後の paragraph は残る
  - forum-post / direct-message でも disabled になる
  render (tests/unit/render/settings.test.ts):
  - enabled: iframe が出る
  - disabled: 手組み AST に html element があっても iframe 出ない (enforcement boundary)
  - disabled: htmlBlockUrl resolver が呼ばれない
  * fix(parser): allowHtmlBlocks=false での leak と close-detection を強化
  3 件の漏れ・誤検出を修正:
  1. (High) close-detection の修正
     parseBlockName で名前が "html" と一致した時点で foundClose=true に
     していたため、malformed `[[/html no-close` (BLOCK_CLOSE 欠落) で close
     と誤認識し、後続テキストが leak する可能性があった。BLOCK_CLOSE まで
     reach できることを確認してから close と認める実装に変更 (whitespace は
     許容)。これにより disabled 時の unclosed パスも常に EOF まで consume
     する。
  2. (Medium) text-level の [[html]] strip pre-pass を追加
     block-rule の gate だけでは段落内 `before [[html]]X[[/html]] after`
     のような inline-position occurrence を捕まえられない (block dispatcher
     が mid-paragraph トークンに到達しない)。Wikidot 互換の非貪欲 regex で
     parse 開始時に text-level で strip し、両ポジションで漏れない設計に変更。
     parse() に `stripDisabledHtmlBlocks` を追加。
  3. (Low) disabled 時の contents 累積をスキップ
     disabled では body を破棄するため、token.value を contents に積む処理
     をガード。大きな入力でのメモリ/CPU を節約。
  test: 段落内 inline 漏れ防止 + malformed close 漏れ防止 のケースを追加。
  * refactor(parser): allowHtmlBlocks gate を inline rule で実装 (text-level pre-pass 廃止)
  text-level pre-pass の問題点を洗い直して再設計:
  1. (High) Parser class 直接使用で pre-pass がバイパスされる
  2. (High) closed のみ strip、mid-paragraph unclosed が漏れる
  3. (Medium) text-level pre-pass が [[code]]/[[html]] 等 raw 内も削除
  4. (Medium) strip 後の lex で diagnostic 位置がずれる
  5. (Medium) pre-pass の gate が truthiness、rule/render は === false
  → text-level pre-pass を廃止し、inline html rule 追加で再設計:
  - packages/parser/src/parser/preprocess/strip-disabled-html.ts 削除
  - parse() を元に戻す
  - packages/parser/src/parser/rules/inline/html.ts (新規 htmlInlineRule):
    - allowHtmlBlocks !== false: success:false (従来挙動維持)
    - === false: [[html]]...[[/html]] を inline で消費、空要素返す
    - close-detection は BLOCK_CLOSE まで verify (whitespace 許容)
    - unclosed: NEWLINE+NEWLINE (blank line) で停止 (後続 paragraph 保護)
  - block rule にも同じ blank-line 停止を追加
  - inline rules 配列に登録 (commentRule の直後)
  これで5件すべて解消:
  1. rule 自体が parse 時に走るので Parser 直接使用でも gate される
  2. inline rule が mid-paragraph closed/unclosed 両方扱う
  3. [[code]]/[[html]] 内は block rule で raw 扱いされ inline rule は到達しない
  4. source mutation なしで位置情報そのまま
  5. すべて === false に統一
  test 追加: Parser 直接使用 / blank-line で stop / code 内 [[html]] 保護
  * fix(parser): enabled html block の空行誤認 + close 末尾 whitespace 漏れを修正
  2 件のバグを修正:
  1. (High) blank-line stop が enabled でも効き、空行を含む valid [[html]]
     block が page mode で壊れる。例: [[html]]\n<p>one</p>\n\n<p>two</p>\n[[/html]]
     → blank-line stop を disabled 時のみに限定。
  2. (Medium) close detection は [[/html ]] (whitespace before ]]) を
     許容するが、close 消費側が whitespace を skip しておらず ]] が paragraph
     text に漏れていた。close 消費側にも whitespace skip を追加。
  test: 空行入り valid html block / whitespace 付き close tag のケース追加。
  * fix(parser): disabled でも closed [[html]] の body 内空行で漏れていた問題を修正
  disabled mode で blank-line stop が close より先に発火し、空行を含む
  closed [[html]] (例: [[html]]\n<p>one</p>\n\n<p>two</p>\n[[/html]]) の
  後半 <p>two</p> と [[/html]] が paragraph text に漏れていた。
  修正: 事前の forward lookahead で real close 存在を確認する
  lookaheadHasHtmlClose ヘルパを追加し、close が ahead に存在する場合は
  blank-line stop を抑止。close 不在 (truly unclosed) の時のみ blank-line
  stop が効く。block rule / inline rule 両方に適用。
  regression test: disabled mode で空行入り closed block が完全に消費される
  ことを確認。

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 2.0.0

### ❤️ Thank You

- r74tech @r74tech

## 1.4.0 (2026-05-20)

### 🩹 Fixes

- **render:** category-prefixedページのpageExistsチェックスキップ問題を修正 ([be79ba2](https://github.com/r74tech/wdpr/commit/be79ba2))

### ❤️ Thank You

- r74tech

## 1.3.3 (2026-02-21)

### 🩹 Fixes

- includeの行頭限定とembed iframeのstyle/class属性保持 ([#29](https://github.com/r74tech/wdpr/pull/29))

### ❤️ Thank You

- r74tech @r74tech

## 1.3.2 (2026-02-17)

### 🚀 Features

- **decompiler:** HTML→Wikidot逆変換パッケージを追加 ([#25](https://github.com/r74tech/wdpr/pull/25))
- サイドバーにフォルダツリー表示を追加 ([ef6960c](https://github.com/r74tech/wdpr/commit/ef6960c))
- サイドバーにグループ別折りたたみツリーを追加 ([44cf424](https://github.com/r74tech/wdpr/commit/44cf424))
- バージョン別APIドキュメント対応 ([#24](https://github.com/r74tech/wdpr/pull/24))

### 🩹 Fixes

- typedoc設定を旧packageOptions相当に統一 ([cd1b524](https://github.com/r74tech/wdpr/commit/cd1b524))

### ❤️ Thank You

- r74tech @r74tech

## 1.3.1 (2026-02-17)

### 🚀 Features

- **decompiler:** HTML→Wikidot逆変換パッケージを追加 ([#25](https://github.com/r74tech/wdpr/pull/25))
- サイドバーにフォルダツリー表示を追加 ([ef6960c](https://github.com/r74tech/wdpr/commit/ef6960c))
- サイドバーにグループ別折りたたみツリーを追加 ([44cf424](https://github.com/r74tech/wdpr/commit/44cf424))
- バージョン別APIドキュメント対応 ([#24](https://github.com/r74tech/wdpr/pull/24))

### 🩹 Fixes

- typedoc設定を旧packageOptions相当に統一 ([cd1b524](https://github.com/r74tech/wdpr/commit/cd1b524))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 1.2.1

### ❤️ Thank You

- r74tech @r74tech

## 1.3.0 (2026-02-12)

This was a version bump only for @wdprlib/render to align it with other projects, there were no code changes.

## 1.2.4 (2026-02-12)

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 1.2.0

## 1.2.3 (2026-02-08)

### 🩹 Fixes

- **parser,render:** [[iftags]]の条件評価バグとCSS漏出を修正 ([#22](https://github.com/r74tech/wdpr/pull/22))

### ❤️ Thank You

- r74tech @r74tech

## 1.2.2 (2026-02-08)

### 🩹 Fixes

- **parser,render:** [[iftags]]の条件評価バグとCSS漏出を修正 ([#22](https://github.com/r74tech/wdpr/pull/22))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 1.1.1

### ❤️ Thank You

- r74tech @r74tech

## 1.2.1 (2026-02-08)

### 🚀 Features

- llms.txt + Markdown ドキュメント生成を追加 ([#17](https://github.com/r74tech/wdpr/pull/17))

### 🩹 Fixes

- パーサー・レンダラーの軽微なバグ4件を修正 ([#18](https://github.com/r74tech/wdpr/pull/18), [#7](https://github.com/r74tech/wdpr/issues/7))
- polynomial ReDoSの正規表現パターンを修正 ([#15](https://github.com/r74tech/wdpr/pull/15), [#20](https://github.com/r74tech/wdpr/issues/20), [#23](https://github.com/r74tech/wdpr/issues/23), [#24](https://github.com/r74tech/wdpr/issues/24))

### ❤️ Thank You

- r74tech @r74tech

# Changelog

## 1.2.0 (2026-02-07)

### 🚀 Features

- embed-block でプロトコル相対 URL と HTTP スキームを対応 ([#14](https://github.com/r74tech/wdpr/pull/14))

## 1.1.0 (2026-02-07)

### 🚀 Features

- WikitextMode / WikitextSettings を導入 ([#13](https://github.com/r74tech/wdpr/pull/13))

## 1.0.1 (2026-02-07)

### ♻️ Refactors

- jsdom + DOMPurify を sanitize-html + htmlparser2 に置き換え ([#11](https://github.com/r74tech/wdpr/pull/11))

## 1.0.0 (2026-02-06)

安定版リリース。1.0.0-rc.0 からの機能変更なし。

## 1.0.0-rc.0 (2026-02-06)

### 🚀 Features

- embed-block に DOMPurify を導入 ([3d95f84](https://github.com/r74tech/wdpr/commit/3d95f84))
- bibliography/bibcite 構文を実装 ([d837dd6](https://github.com/r74tech/wdpr/commit/d837dd6))
- math 要素のレンダリングを MathML + SVG ポリフィル方式に変更 ([1970d03](https://github.com/r74tech/wdpr/commit/1970d03))
- [[embed]] ブロックを実装 ([dc4b585](https://github.com/r74tech/wdpr/commit/dc4b585))
- iftags の条件評価を実装 ([8ac1e5c](https://github.com/r74tech/wdpr/commit/8ac1e5c))

### 🩹 Fixes

- **sec:** embed-block の ReDoS 脆弱性を修正 ([8038ef2](https://github.com/r74tech/wdpr/commit/8038ef2))
- **sec:** embed-block の src 属性検証を強化 ([24f05df](https://github.com/r74tech/wdpr/commit/24f05df))
- **sec:** medium セキュリティ issue の修正 ([96e766d](https://github.com/r74tech/wdpr/commit/96e766d))
- **sec:** セキュリティ脆弱性の修正 ([bb4a7b4](https://github.com/r74tech/wdpr/commit/bb4a7b4))
- medium バグ issue の修正 + DOMPurify 設定改善 ([66e9c67](https://github.com/r74tech/wdpr/commit/66e9c67))
- Element 型の型絞り込みを修正 ([197369c](https://github.com/r74tech/wdpr/commit/197369c))
- user 要素のパースとレンダリングを修正 ([f6e74cd](https://github.com/r74tech/wdpr/commit/f6e74cd))
- 未解決の include にエラーメッセージを出力 ([387cf1d](https://github.com/r74tech/wdpr/commit/387cf1d))
- ブロックリストの Wikidot 互換性を向上 ([c7403c0](https://github.com/r74tech/wdpr/commit/c7403c0))
- トリプルブラケットリンクとページリンクレンダリングの改善 ([d83aa6d](https://github.com/r74tech/wdpr/commit/d83aa6d))
- リンクの rel 属性削除 ([7fea04a](https://github.com/r74tech/wdpr/commit/7fea04a))
- image 構文の Wikidot 互換性を向上 ([c1dbe68](https://github.com/r74tech/wdpr/commit/c1dbe68))
- html 要素のパース・レンダリング修正 ([a406bd6](https://github.com/r74tech/wdpr/commit/a406bd6))
- raw 構文の Wikidot 互換性を向上 ([0de5c67](https://github.com/r74tech/wdpr/commit/0de5c67))

## 0.1.0 (2026-01-31)

初期リリース。Wikidot マークアップの AST から HTML への変換を提供。
