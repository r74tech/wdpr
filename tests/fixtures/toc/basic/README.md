`wikidot.html` は 2026-09-06 に SCP-JP の `edit/PagePreviewModule` へ
`input.ftml` を渡して取得した実機出力です。ページの保存は行っていません。

`output.html` との差は、既定ラベルの言語（目次 / 折り畳む / 表示）です。
WDPR の既定ラベルは英語のため、タイトル指定なしの目次は Table of Contents、
操作ラベルは Fold / Unfold を期待します。onclick は runtime 側の担当です。

通常タイトル、左右 float、空タイトルは実機で確認しています。
タイトル内の HTML は実機が解釈する一方、WDPR はテキストとしてエスケープします。
この安全性の差を実機一致として扱わないため、HTML を含むタイトルは本 fixture に含めません。
