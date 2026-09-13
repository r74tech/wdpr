# 2.0.0 (2026-09-13)

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

- Updated @wdprlib/decompiler to 1.5.1
- Updated @wdprlib/parser to 6.0.0
- Updated @wdprlib/render to 5.0.0
- Updated @wdprlib/ast to 5.0.0

### ❤️ Thank You

- r74tech @r74tech

## 1.4.0 (2026-09-12)

### 🩹 Fixes

- Wikidotとの構文・描画の差分を修正 ([#75](https://github.com/r74tech/wdpr/pull/75))

### 🧱 Updated Dependencies

- Updated @wdprlib/decompiler to 1.5.0
- Updated @wdprlib/parser to 5.4.0
- Updated @wdprlib/render to 4.3.0
- Updated @wdprlib/ast to 4.3.0

### ❤️ Thank You

- r74tech @r74tech

## 1.3.0 (2026-09-09)

### 🩹 Fixes

- Wikidotとの構文・描画の差分を修正し、i18nとビルド情報を追加する ([#73](https://github.com/r74tech/wdpr/pull/73))

### ❤️ Thank You

- r74tech @r74tech

## 1.2.3 (2026-09-02)

### 🩹 Fixes

- **runtime:** ギャラリー画像をgrid列幅に収める ([#70](https://github.com/r74tech/wdpr/pull/70))

### ❤️ Thank You

- r74tech @r74tech

## 1.2.2 (2026-08-24)

### 🩹 Fixes

- 画像サイズとギャラリー表示を修正 ([#64](https://github.com/r74tech/wdpr/pull/64))

### 🔥 Performance

- **render:** 長文レンダリングの二重HTML生成を省く ([#65](https://github.com/r74tech/wdpr/pull/65))

### ❤️ Thank You

- r74tech @r74tech

## 1.2.1 (2026-08-24)

### 🩹 Fixes

- 画像サイズとギャラリー表示を修正 ([#64](https://github.com/r74tech/wdpr/pull/64))

### ❤️ Thank You

- r74tech @r74tech

## 1.2.0 (2026-08-10)

### 🚀 Features

- 高レベルpipelineとadapter利用性を改善 ([#58](https://github.com/r74tech/wdpr/pull/58))

### ❤️ Thank You

- r74tech @r74tech

## 1.1.0 (2026-07-22)

### 🚀 Features

- add [[gallery]] syntax support ([#55](https://github.com/r74tech/wdpr/pull/55))
- **parser/ast:** opener-embedded [[#if]] / [[#expr]] / [[#ifexpr]] と [[iftags]] bare prefix 対応 ([#50](https://github.com/r74tech/wdpr/pull/50))

### ❤️ Thank You

- r74tech @r74tech

## 1.0.3 (2026-06-04)

### 🩹 Fixes

- **runtime:** 狭い viewport で footnote tooltip がはみ出る問題を修正 ([#39](https://github.com/r74tech/wdpr/pull/39))

### ❤️ Thank You

- r74tech @r74tech

## 1.0.2 (2026-02-17)

### 🚀 Features

- **decompiler:** HTML→Wikidot逆変換パッケージを追加 ([#25](https://github.com/r74tech/wdpr/pull/25))
- サイドバーにフォルダツリー表示を追加 ([ef6960c](https://github.com/r74tech/wdpr/commit/ef6960c))
- サイドバーにグループ別折りたたみツリーを追加 ([44cf424](https://github.com/r74tech/wdpr/commit/44cf424))
- バージョン別APIドキュメント対応 ([#24](https://github.com/r74tech/wdpr/pull/24))

### 🩹 Fixes

- typedoc設定を旧packageOptions相当に統一 ([cd1b524](https://github.com/r74tech/wdpr/commit/cd1b524))

### ❤️ Thank You

- r74tech @r74tech

# Changelog

## 1.0.1 (2026-02-07)

### 🚀 Features

- WikitextMode / WikitextSettings を導入 ([#13](https://github.com/r74tech/wdpr/pull/13))

## 1.0.0 (2026-02-06)

安定版リリース。1.0.0-rc.0 からの機能変更なし。

## 1.0.0-rc.0 (2026-02-06)

初期リリース。

### 🚀 Features

- math 要素のレンダリングを MathML + SVG ポリフィル方式に変更 ([1970d03](https://github.com/r74tech/wdpr/commit/1970d03))
