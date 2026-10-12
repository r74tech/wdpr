`wikidot.html` は 2026-10-08 に SCP-JP の `edit/PagePreviewModule` へ
`input.ftml` を渡して取得した実機出力です。ページの保存は行っていません。

Wikidot は `[[span]]` と `[[/span]]` の組を `[[div]]` より先に決め、
出力を HTML Tidy で修復します。そのため span は div の境界で閉じられ、
境界の後ろで同じ属性のまま開き直されます。`[[/div]]` は span の中身にならず、
div は閉じます。

`output.html` との差は、div 直後の本文を `<p>` で包むかどうかです。
実機は `<p>` で包まずに `<br />` から始めますが、WDPR は `<p>` で包みます。
この差は span を含まない `[[div]]` の直後でも同じように出ます。

入れ子の span が両方とも div をまたぐ場合、実機は外側の span だけを
開き直し、WDPR は両方を開き直します。この入力は本 fixture に含めません。
