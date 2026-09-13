# 5.0.0 (2026-09-13)

### 🚀 Features

- ⚠️  カスタム評価とListPagesのメタデータ・本文抽出を追加 ([#77](https://github.com/r74tech/wdpr/pull/77))

### ⚠️  Breaking Changes

- カスタム評価とListPagesのメタデータ・本文抽出を追加  ([#77](https://github.com/r74tech/wdpr/pull/77))
  ListPagesのpreview・summary・first_paragraphはPageData.readableTextを参照し、生のcontentへフォールバックしない。sizeの既定値0を廃止し、省略可能にする。
  * feat!: CustomRateと中立票・投票権限に対応
  Rateを通常評価、CustomRateを登録済みキーの評価として分離し、状態と許可票種をproviderから取得する。
  include内の宣言も表示先ページへ結び付け、ListPagesやListUsersが生成する投票UIは抑止する。
  中立票を値0、取り消しを別の操作として扱い、同じ評価を複数表示した場合も投票結果を同期する。
  登録キーの照合、宣言の解決、投票と取り消し、権限による操作制限をテストする。
  送信失敗後の再操作とキーボード操作もruntimeの回帰テストで確認する。
  BREAKING CHANGE: onRateをonRate(ref, action)へ変更し、戻り値をRatingStateまたはnullとする。0はNVとし、取り消しにはcancelを使う。Rateの描画にはproviderによる状態の供給が必要になる。
  * feat: 登録済み評価・メタデータの取得とコメント順を追加
  ListPagesのcustomrate系変数とmetadata変数から必要なキーを抽出し、providerへ渡す。
  返された登録値はキーの完全一致で参照し、欠落値と値0を区別して表示する。
  評価軸による絞り込みと並び替え、メタデータ順、コメント数順と最終コメント日時順の契約を追加する。
  必要なキーと並び順の正規化、日時の書式指定、値0と未登録値の表示をテストする。
  変数の値を構文として再実行しないことと、URLから渡した評価軸の大文字・小文字を保持することも確認する。
  * feat!: 投票APIと本文取得を新しい形式に対応
  デモの投票APIとクライアントをref・actionによる操作へ移行し、通常評価をproviderへ接続する。
  include展開後に表示先ページの投票宣言を確認し、宣言のない評価への投票を受け付けない。
  中立票は値0のレコードとして保存し、取り消し操作でのみ票を削除する。
  ListPagesへ解決済み本文を供給し、未登録の評価軸や未対応の並び順では結果を返さない。
  中立票の保存と取り消し、include先の表示ページへの投票、宣言のないページと不正な入力の拒否をAPIテストで確認する。
  BREAKING CHANGE: /api/rateの入力をpage_id・ref・actionへ変更し、RatingStateを返す。従来のpoints入力は受け付けない。
  * feat: サイト共通の評価軸をD1とListPagesへ接続
  サイトと任意キーで評価軸を登録し、CustomRateの表示・許可票種・投票・取り消しを同じ定義から解決する。
  票はページと評価軸と利用者ごとに保存し、includeでは表示先ページに紐付ける。
  ListPagesのcustomrate値とrating-axisによる絞り込み・並び替えをD1集計へ接続する。
  未登録・無効・非公開集計の軸を提供せず、主評価や別サイトの票を混在させない。
  テーブルを追加するマイグレーションと、複数ページで共通の評価軸を使う初期データを追加する。
  D1を使った回帰テストでキーの完全一致、サイトと評価軸の分離、権限、投票集計、ListPagesの取得結果を確認する。
  * fix: 条件分岐の構文用空白を本文抽出から除外
  ifとifexprの選択された分岐から、末尾にある空白だけのtext要素を描画と同じ規則で除く。
  構文由来の空白が文字数や抜粋に混入する問題を修正する。
  英字・日本語・空の分岐について、抽出本文と文字数・抜粋を回帰テストで確認する。
  * fix: seed再実行で既存ページと投票を保持する
  初期データの登録をREPLACEから競合時のDO NOTHINGへ変更する。
  既存ページの削除に伴うタグ参照の外部キーエラーを防ぎ、再実行でも編集済みのページや投票を保持する。
  登録が途中で止まっていたCustomRate用の評価軸とサンプルページも追加できるようにする。
  初期データを再実行して既存レコードと外部キー整合性が保たれることを回帰テストで確認する。
  ローカルのデモでは、登録された2つのCustomRateが表示されることも確認する。
  * fix: 解決済みincludeの本文と脚注を抽出する
  本文抽出時に解決済みincludeの子要素をたどり、親からの除外状態を引き継ぐ。
  include内の本文が文字数や抜粋から欠落し、後続の脚注番号と本文の対応がずれる問題を修正する。
  include内の本文と文字数、include前後の脚注の並び、除外されたincludeの扱いを回帰テストで確認する。
  * fix: 見出しを除いた最初の段落を取得する
  本文抽出と同じASTの走査で、最初の空でない段落を取得するextractFirstParagraphを追加する。
  結果をproviderのfirstParagraphへ渡し、ListPagesのfirst_paragraphとsummaryが冒頭の見出しを返す問題を修正する。
  見出し、空段落、include、条件分岐、脚注を含む文書から最初の段落を選ぶことをテストする。
  デモのListPagesでも、providerが渡した段落が表示されることを確認する。
  * fix: 回復可能な警告で本文と文字数を破棄しない
  デモのListPages用の本文取得をreadPageTextへまとめ、回復可能な構文警告だけでは抽出結果を破棄しないようにする。
  取得失敗のinclude、未解決のモジュール、展開上限やエラーがある場合は未計算のまま扱う。
  描画できる本文の抜粋と文字数を保ち、不完全な展開結果を全文として提供することを防ぐ。
  閉じ忘れのcodeで本文と文字数が残ることを回帰テストで確認する。
  include取得失敗、モジュール未解決、展開上限では未計算になることも確認する。
  * fix: 読者向け文字数で一覧を並べ替える
  デモのListPagesでsize・pagelength順を処理し、候補ページの読者向け文字数を計算してから並び替えとページングを行う。
  本文取得は80件単位、include解決は4ページ単位に分け、文字数を計算できないページは末尾に置く。
  文字数順以外は、表示対象を選んでから本文を取得する。
  昇順・降順、同じ文字数の並び、offsetとlimit、未計算値の扱いを回帰テストで確認する。
  結合文字、include、条件分岐を含む文字数と、105件の候補を扱う取得処理も検証する。
  * feat!: 正規表現と一致番号による抜粋に対応する
  本文全体から正規表現で検索し、取得グループ・一致番号・最大文字数を指定できる抜粋へ変更する。
  RE2JSでパターンを処理し、入力長、パターン長、プログラムサイズ、検索回数、推定処理量を制限する。
  無効な指定や未対応の構文、未一致、上限超過では空文字を返す。
  ListPagesでは引用符内の量指定子やバックスラッシュを保持し、抽出結果をリテラルとして表示する。
  第2一致、名前付きキャプチャ、検索フラグ、書記素単位の切り詰めと各上限をテストする。
  日本語本文の抽出、構文を含む結果の表示、D1から取得した本文の抜粋も確認する。
  BREAKING CHANGE: 抜粋の区切り文字指定を廃止し、pattern・group・match・maxによる正規表現指定へ変更する。
  * feat: providerから投票ボタンの表示ラベルを指定できるようにする
  RatingStateにvoteLabelsを追加し、通常評価とCustomRateの票値1・0・-1へ表示文字列を指定できるようにする。
  指定を省略した票は既定の表示を使い、投票値と許可票種は従来の状態に従う。
  初期描画ではエスケープし、runtimeではtextContentで更新して、ラベルを文字列として扱う。
  ▲・■・▼の表示、部分指定と全省略、投票後のラベル変更、同じ評価を複数表示した場合の同期をテストする。
  表示を変更しても中立票と取り消しの操作が変わらないことと、公開型から指定できることを確認する。
  * feat: サイト共通の評価軸に投票ラベルを保存する
  D1のsite_rating_axesへUV・NV・DVの表示ラベル列を追加し、providerの初期状態と投票APIの応答へ反映する。
  既存の評価軸には従来の表示を既定値として設定し、初期データにもラベルの指定例を追加する。
  初期データを再実行しても利用者が変更したラベルを保持する。
  ▲・■・▼の指定が初期描画とAPI応答へ渡ることを回帰テストで確認する。
  マイグレーション前後の評価軸と投票の保持、既定値、初期データ再実行時のラベル保持も検証する。
  * fix: 本文整形の正規表現で空白の反復数を制限
  連続する空白を1個へ正規化した後の改行処理を、空白0〜1個の一致へ変更する。
  ASCII・日本語・タブ・CRLF・空行・空文字について、本文全体と最初の段落の整形結果を回帰テストで確認する。

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 5.0.0

### ❤️ Thank You

- r74tech @r74tech

## 4.3.0 (2026-09-12)

### 🩹 Fixes

- Wikidotとの構文・描画の差分を修正 ([#75](https://github.com/r74tech/wdpr/pull/75))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 4.3.0

### ❤️ Thank You

- r74tech @r74tech

## 4.2.0 (2026-09-11)

### 🚀 Features

- ListPagesのページャーを実装 ([#74](https://github.com/r74tech/wdpr/pull/74))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 4.2.0

### ❤️ Thank You

- r74tech @r74tech

## 4.1.0 (2026-09-09)

### 🩹 Fixes

- Wikidotとの構文・描画の差分を修正し、i18nとビルド情報を追加する ([#73](https://github.com/r74tech/wdpr/pull/73))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 4.1.0

### ❤️ Thank You

- r74tech @r74tech

## 4.0.7 (2026-08-30)

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 4.0.2

## 4.0.6 (2026-08-30)

### 🚀 Features

- **render:** userの非同期一括解決を追加 ([#68](https://github.com/r74tech/wdpr/pull/68))

### ❤️ Thank You

- r74tech @r74tech

## 4.0.5 (2026-08-24)

### 🩹 Fixes

- 画像サイズとギャラリー表示を修正 ([#64](https://github.com/r74tech/wdpr/pull/64))

### 🔥 Performance

- **render:** 長文レンダリングの二重HTML生成を省く ([#65](https://github.com/r74tech/wdpr/pull/65))

### ❤️ Thank You

- r74tech @r74tech

## 4.0.4 (2026-08-24)

### 🩹 Fixes

- 画像サイズとギャラリー表示を修正 ([#64](https://github.com/r74tech/wdpr/pull/64))

### 🔥 Performance

- **render:** 長文レンダリングの二重HTML生成を省く ([3cbb802](https://github.com/r74tech/wdpr/commit/3cbb802))

### ❤️ Thank You

- r74tech @r74tech

## 4.0.3 (2026-08-11)

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 4.0.1

## 4.0.2 (2026-08-11)

This was a version bump only for @wdprlib/render to align it with other projects, there were no code changes.

## 4.0.1 (2026-08-11)

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 3.0.1

# 4.0.0 (2026-08-10)

### 🚀 Features

- 高レベルpipelineとadapter利用性を改善 ([#58](https://github.com/r74tech/wdpr/pull/58))

### 🩹 Fixes

- **release:** 誤ったast releaseを取り消す ([#60](https://github.com/r74tech/wdpr/pull/60))
- Securityレポートで検出された脆弱性の修正 ([#57](https://github.com/r74tech/wdpr/pull/57))

### ❤️ Thank You

- r74tech @r74tech

## 3.3.1 (2026-08-10)

### 🚀 Features

- 高レベルpipelineとadapter利用性を改善 ([#58](https://github.com/r74tech/wdpr/pull/58))

### 🩹 Fixes

- **release:** 誤ったast releaseを取り消す ([#60](https://github.com/r74tech/wdpr/pull/60))
- Securityレポートで検出された脆弱性の修正 ([#57](https://github.com/r74tech/wdpr/pull/57))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 3.0.0

### ❤️ Thank You

- r74tech @r74tech

## 3.3.0 (2026-07-24)

### 🚀 Features

- add high-level wikitext processing and rendering pipeline APIs ([#56](https://github.com/r74tech/wdpr/pull/56))

### ❤️ Thank You

- r74tech @r74tech

## 3.2.1 (2026-07-24)

### 🚀 Features

- add high-level wikitext processing and rendering pipeline APIs ([#56](https://github.com/r74tech/wdpr/pull/56))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 2.4.0

### ❤️ Thank You

- r74tech @r74tech

## 3.2.0 (2026-07-22)

### 🚀 Features

- add [[gallery]] syntax support ([#55](https://github.com/r74tech/wdpr/pull/55))

### ❤️ Thank You

- r74tech @r74tech

## 3.1.1 (2026-07-22)

### 🚀 Features

- add [[gallery]] syntax support ([#55](https://github.com/r74tech/wdpr/pull/55))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 2.3.0

### ❤️ Thank You

- r74tech @r74tech

## 3.1.0 (2026-07-22)

### 🚀 Features

- **parser:** add TagCloud module support ([#54](https://github.com/r74tech/wdpr/pull/54))

### ❤️ Thank You

- r74tech @r74tech

## 3.0.2 (2026-07-22)

### 🚀 Features

- **parser:** add TagCloud module support ([#54](https://github.com/r74tech/wdpr/pull/54))

### 🧱 Updated Dependencies

- Updated @wdprlib/ast to 2.2.0

### ❤️ Thank You

- r74tech @r74tech

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
