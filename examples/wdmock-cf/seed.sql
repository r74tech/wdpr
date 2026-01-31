-- Admin user
INSERT OR IGNORE INTO users (user_id, name, unix_name) VALUES (1, 'admin', 'admin');

-- Default user
INSERT OR IGNORE INTO users (user_id, name, unix_name) VALUES (2, 'user', 'user');

-- Admin as site member
INSERT OR IGNORE INTO members (site_id, user_id) VALUES (1, 1);

-- User as site member
INSERT OR IGNORE INTO members (site_id, user_id) VALUES (1, 2);

INSERT OR REPLACE INTO pages (site_id, category, unix_name, title, source, owner_user_id) VALUES (1, 'nav', 'top', 'Top Navigation', '[[div class="top-bar"]]
* [/ Home]
* [/about About]
[[/div]]
[[div class="mobile-top-bar"]]
[[div class="open-menu"]]
[#side-bar ≡]
[[/div]]
* [/ Home]
* [/about About]
[[/div]]
', 1);
INSERT OR REPLACE INTO pages (site_id, category, unix_name, title, source, owner_user_id) VALUES (1, 'nav', 'side', 'Side Navigation', '[[div class="side-block"]]

[[div class="menu-item"]]
[[image https://scp-jp.github.io/files/util/common/media/nav/side/home.png]][/ メインページ]
[[/div]]

[[div class="heading"]]
Recent Pages
[[/div]]
[[module ListPages limit="20" order="-date_created"]]
[[div class="menu-item"]]
[[image https://scp-jp.github.io/files/util/common/media/nav/side/default.png]]%%title_linked%%
[[/div]]
[[/module]]

[[/div]]

[[a href="##" class="close-menu"]]
[[image https://scp-jp.github.io/files/util/common/media/nav/side/black.png style="z-index:-1; opacity: 0.3;"]]
[[/a]]
', 1);
INSERT OR REPLACE INTO pages (site_id, category, unix_name, title, source, owner_user_id) VALUES (1, '_default', 'main', 'main page', '+ Main Page
[[module ListPages limit="5" order="-date_created" category="_default"]]
* %%title_linked%% (by %%created_by%%, %%created_at%%)
[[/module]]
', 1);
INSERT OR REPLACE INTO pages (site_id, category, unix_name, title, source, owner_user_id) VALUES (1, '_default', 'about', 'About', '+ About WikidotMock

This is an example application demonstrating the capabilities of the wdpr library.

++ Architecture

* **Server**: Hono on Cloudflare Workers
* **Database**: Cloudflare D1 (SQLite)
* **Parser**: @wdprlib/parser
* **Renderer**: @wdprlib/render
* **Runtime**: @wdprlib/runtime (client-side)
', 1);
INSERT OR REPLACE INTO pages (site_id, category, unix_name, title, source, owner_user_id) VALUES (1, '_default', 'scp-280-jp', 'SCP-280-JP', '[[include credit:start]]
**タイトル:** SCP-280-JP - 縮小する時空間異常
**著者:** ©︎[[*user dr_toraya]]
**作成年:** 2015
[[include credit:end]]



[!--
､ﾊ､ﾇ､ｳ､ﾊ･ｽ｡ｼ･ｹｸｫ､ﾆ､・ﾀ｡｣､ｷ､ｫ､筵ｨ･ｳ､ﾞ､ﾇﾄｾ､ｷ､ﾆ｡｣､ｽ､ﾊ､ｳ､ﾈ､ｷ､ﾆ､｢､ﾊ､ｿ､筵ｹ･ｯ･・ﾗ･ﾈ､ﾈ､ﾃ､ｿｵｭｻｭ､ｿ､､､ﾎ､ﾇ､ｹ､ｫ｡｣､｢｡｢ｺ｣ﾊﾃ讀ﾇｽ､､ｿ､ﾎ､ﾏ･｢･・ﾕ･｡･ﾙ･ﾃ･ﾈ､ｽ､ﾎ､ﾞ､ﾞｽｯ､ﾈ･ｨ･ｳ｡ｼ･ﾉ､ｷ､ﾆ､筅ｽ､ﾎ､ﾞ､ﾞ､ﾋ､ﾊ､・ｳ､ﾈ､・ｰ､ｷ､ﾆ､ﾇ､ｹ｡｣､ｳ､ﾊ､ﾈ､ｳ､惕ｫ､ﾆ､､､・ﾋ､ｬ､｢､ﾃ､ｿ､鬢ｵ､ﾃ､ｵ､ﾈｿｷ､ｷ､､ｵｭｻｯ､ﾎ､ﾇ､ｹ｡｣､ｵ､｢｡｢､ｵ､｢｡｢､ｵ､｢｡ｪｔ・・・・煤\ース桁!逐・・・Bｋ!・焉Gンコ・・死・・Bｎ!・楳・凍閠・逐ｔ・焉Xクリプトり携ｑ!・L魔闕曹・・÷摩・・・Bあ、香4・・・曹÷・摩・Aルファベットり・摩梳檮曹・刀Gンコードｋ!逐烙・摩梳梳・楳・・凍闃恃Oｋ!逐・・Bｉ!・楳凍・・闃・逐÷・・・ｑ!・・・・・梼Vｋ!♂L魔闕曹・摩・・Bｊ!、ｊ!、ｊ!！@$#9000･､･ｸ!!!1!!*(#$Object Class: Ke@#%^ SUPR1337･ｱ･ﾆ･・!!!!!1!!!1!111!!#$%^ ｼ隹ｷﾊ｡ｧSC､ﾏｸｽｺﾟﾉﾇ､ｭ､ﾊ@!#%$･ﾆ･癸ｼ･ﾏ･ﾇ･ｭ･ﾊ･､･茹ﾄ･爭ﾆ･ｭ･ﾀ･ｼ!!!1!!1!1!111!!@#､ｫ､ｷ｡｢､筅ｷ｡｢ﾉｹ､・ｳ､ﾈ､ｬｽﾐﾍ隍・ﾐﾃｱﾆﾈ､ﾇﾉｷ｡｢S､ﾏ､ｹ､ﾙ､ﾆ､ﾎﾉﾔｲﾄｷ遉ﾊｵｭﾏｿ､ｫ､鯰･､ｷ､ｿｾﾖ､ﾇ､ｵ､鬢ﾋ@#$%3^@4167｡｣1500ﾉｰ､ｫ､鬢ﾊ､・酣｡ﾂﾈﾈ・ｩ､ﾎｸｦｵ貎熙ﾇﾈﾈｺ皃ﾈﾀ・､､ｽ､ｷ､ﾆｶﾋ､｢､ｯ@#$5$%86&*､ｪﾀｵ､・ｿｵｭﾏｿ､ﾏ､ｵ､鬢ﾊ､・ｶﾀﾉ､ｰ､ｿ､睇ﾋｲｷ､ﾊ､ｱ､・ﾐ､ﾊ､熙ﾞ､ｻ､ﾗ｡ｧ2#%^&@､・ﾏ､ﾇ､ｹ｡｣､ﾈ､ﾆ､籥ｯﾍ釥ｬｾ蠑熙ｯﾌ･ﾎﾏﾅｪ､ﾊ^&*(%@､ﾞ､ﾈ､ﾞ､熙ﾎ､ﾊ､､ﾁﾏｺ釥ﾎﾃ讀ﾋｵｭ､・%^&ﾄｶﾇｽ､熙螟ｯ､ｬﾈ・ﾃ､ﾆ､ｪ､・ﾒﾌﾜ､ﾞ､ｿ､ﾐ､ｭ､ｹ､・ﾐ､ﾒ､ﾈ､ﾈ､皃ｭﾈﾐ､ｹ､ｳ､ﾈ､ｬ､ﾇ､ｭ､ﾞ､ｹ#$%^､､､ﾆｸｽｺﾟﾉﾔﾌﾀ@#$%･茹ﾄ･ﾏ･ｹ･ﾙ･ﾆ･ﾎSCP･ﾇ･ｵ･､･ｳ｡ｼ･ﾋKEWL･ﾀ･ｼ@#$%@$､ﾄﾌ荀ﾏ32､ﾎﾀｭｼﾁｾ螟ﾛ､ﾈ､ﾉﾀｮｸｷ､ﾆ､､､ﾞ､ｻ､・$%･ｳ･ｨ｡ｼ!!!1!!11!!･ｭ･ﾟ･・・､･ｨ･ﾋ･ﾁ･逾ｦ･ｳ･ｨ｡ｼ!!!11!!!!11!!@#､ﾏｾﾚｵﾈ､､､ｨ｡｢#$%^$､､ﾂｬ､ｵ､・ﾞ､ｹ｡｣･ｫ･・ﾈｸﾅﾅｵ､･､ﾟ%^&*%､ﾎｲ譯ｹ､ﾎｵｭﾏｿ､ﾏSC32､ﾎｴ昤ｱ､ﾋｻｯ､ｵ､・ﾆ､､､ﾞ､ｹ｡｣･ﾕ･愠ｯ-73ｺﾇｶ睚ｯﾀｸ､ｷ､ｿSCP-!@#､ｪ､・ﾏ､ｳ､ｸ､ﾇ､ｫ､ｾ､ｯ､筅､､ﾊ､､､ｬ､ｫ､ﾍ､筅ﾁ､ﾀ､ﾖ､・ﾏ､ﾏ､ﾏ､ﾏ!@''､ﾎﾃｦﾁﾇﾃｱｽ网ﾋｴﾊﾃｱ､ﾊ[ｺ・・ﾑ]｡｢-､ﾉ､ｦ､ﾋ､ｫ-ﾇﾛﾃﾖ､ｵ､・ｿｵ｡ﾆｰﾉ筥ｸ-7｡｣SCP-07%^^･｢･ﾙ･・ﾎ･ｱ･ﾄ､ｳ､ﾃ､ﾆ､荀ﾃ､ｿ､ｽ､ｷ､ﾆ･茹ﾄ､ﾏ･ｪ･・ﾎｻﾋｾ蠏豸ﾋｺﾇｹ筅ﾎｿﾆﾍｧ､ﾀ､ｼ｡｢､ｺ､ﾃ､ﾆ､ﾊ!!@#ﾈ爨ｬ"･､･ｿ･ｺ･鮖･､ｭ､ﾎｻ狒ﾀ"､ﾝｸ釥ﾋｹﾔ､ｫ､ｵ､・狒ﾀ､ｸ､网ﾊ､､､ﾈ､・ｫ､・ﾈﾉﾔｵ｡ｷﾋ､ﾊ､熙ﾞ､ｷ､ｿ｡｣､ﾞ､ﾃ､ｿ､ｯ$$SCP-105､ﾎ､ｸ､遉ｦ､ﾛ､ｦ!%^ｵ､､ﾋﾆ､鬢ﾊ､､｡･｡･ｲ譯ｹ､ﾏｻﾄ､ｵ､・ｿﾍｽｻｻ､ﾇSCP-32､ﾎｱﾆｶﾁ､ﾋﾂﾐｽ隍ｹ､・ﾋ｡､ｫ､ﾄ､ｱ､ﾊ､ｱ､・ﾐ､ﾊ､熙ﾞ､ｻ､%$fgsfds!@#｡@$#9000?C?W!!!1!!*(#$Object Class: Ke@#%^ SUPR1337?P?e??!!!!!!1!!!1!111!!#$%^ ?戵?禔FSC?͌??ݕ??ﾅ???ﾈ@!#%$?e???[?n?f?L?i?C???c???e?L?_?[!!!1!!1!1!111!!@#?????A?µ?A???󂷂邱?Ƃ??o???黷ﾎ?P?Ƃŕ??󂵁AS?͂??ׂĂ̕s???ȋL?^???痣?????ﾔ?ł??轤ﾉ@#$%3^@4167?B1500???????轤ﾈ?髑・@?薰ﾆ?閧?̌??????Ŕƍ߂Ɛ킢?????ċɂ???@#$5$%86&*???ꂽ?L?^?͂??轤ﾈ?銴?・h?????ߔj?󂵂Ȃ??黷ﾎ?Ȃ閧ﾜ???v?F2#%^&@?髣ﾍ?ł??B?ƂĂ߭?????緕・????͓I?ﾈ^&*(%@?܂Ƃ܂閧ﾌ?Ȃ??n?・ﾌ???ɋL?・%^&???\?閧・????・BĂ??阨ﾐ?ڂﾜ???΂????黷ﾎ?ЂƂƂ𐁂??ﾎ?????Ƃ??ł??܂?#$%^???Č??ݕs??@#$%???c?n?X?x?e?mSCP?f?T?C?R?[?jKEWL?_?[@#$%@$?竄ﾍ32?̐????繧ﾙ?Ƃﾇ???Ă??܂??・$%?R?G?[!!!1!!11!!?L?~???驛C?G?j?`???E?R?G?[!!!11!!!!11!!@#?͏؋??Ƃ????A#$%^$???????黷ﾜ???B?J???g?ÓT?D?ﾝ%^&*%?̉艨X?̋L?^?ﾍSC32?̊댯?ɎN???黷ﾄ???܂??B?t???N-73?ŋߔ???????SCP-!@#???黷ﾍ?????ł??????¢?Ȃ??????˂¿???Ԃ墲ﾍ?͂͂ﾍ!@''?̒E???ŒP???ɊȒP?ﾈ[?폜?ﾏ]?A-?ǂ??ɂ?-?z?u???ꂽ?@?????ö-7?BSCP-07%^^?A?x???̃P?c?R?BĂ竄ﾁ???????ă??c?̓I???̎j?㋆?ɍō??̐e?F?????A???BĂﾈ!!@#?ނ?"?C?^?Y???D???̎??_"?ﾛ?・ﾉ?s?????ꎀ?_???痰ﾈ???Ƃ킩?驍ﾆ?s?@???ɂȂ閧ﾜ?????B?܂B???$$SCP-105?̂??傤?ق?!%^?C?ɓ・・Ȃ??D?D?艨X?͎c???ꂽ?\?Z?ﾅSCP-32?̉e???ɑΏ????髟・@?쩂??Ȃ??黷ﾎ?Ȃ閧ﾜ???%$fgsfds!@#?B









　　　　　　　　　　おまえのせいだ






UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING…UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING…UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING…UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING…UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING…UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING…UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING…UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING… UPLOADING…


なんてね。
まあ当然こういう記事みたらソース見たくなるよね。
わかってたよ。
こんな隠しネタ仕込むのもどうかと思ったけど、9kbなら画像よりはるかに小さいし、許されるよね。
驚いたらツイッターあたりに「なんじゃこりゃあ、たまげたなあ（SCP-280-JP）」とコメントしてくれると喜びます。

--]

[!--
英文の元文章はこちら。
でもできればせっかく訳してもらったので英文もぜひ読んでください。

SCP-XXXはその移動できない性質のため、SCP-XXXを中心にエリア-██に指定します サイト-81██を建設します。収容施設内は真空かつ光源のない電波暗室に保ってください。収容施設の入口は厳重に施錠し、民間人の立ち入りを防止してください。SCP-XXXの利用を希望する職員は、サイト管理者へ所定の申請書を提出してください。

管理担当者専用

縮小用海水注入プロトコルを実施する場合、次のボタンを押してください。

プロトコル開始

SCP-XXXは直径0.7m(<今日の日付>現在)の時空間異常です。 発見時の直径は<オブジェクトのサイズ>mでしたが、財団による収容後の措置により現在の直径まで縮小することに成功しました。

SCP-XXXは北緯36度39分、東経138度10分、中華人民共和国領ジパング島の上空██kmの地点に存在しています。島には球状にえぐられたような穴があり、これは出現当時のSCP-XXXによるものと考えられています。19██年、島に水路を作成しSCP-XXXに海水を注入することでSCP-XXXは管理可能なサイズにまで縮小されました。

SCP-XXXは物質、電磁波、音など、接触したあらゆるものを消失させる特性を持っています。現在まで消失した物質の追跡調査は成功していません。SCP-XXXは消失させた物質の質量に応じてその直径を縮小させます。またSCP-XXXは空気や電磁波にも反応して縮小するため、現在の直径を維持するために収容施設は真空、暗闇、電波暗室である必要があります。

SCP-XXXは物質の硬度を無視した切削作業が可能です。サイト管理者の許可を得ることでSCP-XXXを用いた実験または加工を行うことが認められます。
--]

[[html]]
<!-- WikidotのデフォルトStyleと、SCP-JPのStyleをインポート -->
<style>
@import url(https://d3g0gp89917ko0.cloudfront.net/v--de24f08b1628/common--theme/base/css/style.css);
@import url(https://d3g0gp89917ko0.cloudfront.net/v--de24f08b1628/common--theme/shiny/css/style.css);
@import url(https://scp-jp.wdfiles.com/local--theme/scp-sigma-9-off-canvas/style.css);
</style>

<div style=''float:right;'' >
<table class="wiki-content-table" id=''scpimgtbl''>
<tbody><tr>
<td colspan="2"><img src='''' alt='''' id=''scpimg'' width=''300'' class="image"></td>
</tr>
<tr>
<th colspan="2"><sup>███████</sup></th>
</tr>
</tbody></table>
&nbsp;<!-- 画像下のスペース確保 -->
</div>
<p id="testjs2">Loading...<br>報告書が表示されない場合は他のブラウザまたは端末からアクセスしてください。</p>
<script type="text/javascript">
<!--
scpsize=1.1

level=0;
uplevel = 1;
viewbtn = 0;
adding = 0;

limen1=15;
limen2=150;
limen3=1500;
limen4=150000;
limen5=6000000;
limen6=120000000;

now = new Date();
hour = now.getHours();
min = now.getMinutes();
sec = now.getSeconds();
ms = now.getMilliseconds();
year=now.getFullYear();
month=now.getMonth()+1;
date=now.getDate();

imgsrc1 = new Image();
imgsrc2 = new Image();
imgsrc3 = new Image();
imgsrc4 = new Image();
imgsrc5 = new Image();
imgsrc6 = new Image();
imgsrc1.src = "https://scp-jp.wdfiles.com/local--files/scp-280-jp/scpj01.jpg";
imgsrc2.src = "https://scp-jp.wdfiles.com/local--files/scp-280-jp/scpj02.jpg";
imgsrc3.src = "https://scp-jp.wdfiles.com/local--files/scp-280-jp/scpj03.jpg";
imgsrc4.src = "https://scp-jp-storage.wikidot.com/local--files/file:3282741-150-4a2e/scpj04.png";
imgsrc5.src = "https://scp-jp.wdfiles.com/local--files/scp-280-jp/scpj05.jpg";
imgsrc6.src = "https://scp-jp.wdfiles.com/local--files/scp-280-jp/scpj06.jpg";

function viewAdmin(){
viewbtn = 1;
timer1= setInterval(''autoAdd()'',4300);
chgStr();
}

function addSize(){
clearInterval( timer1 );
timer2 = setInterval(''addDone()'',700);
adding = 1;
chgStr();
}

function addDone(){
if( scpsize < limen3 ){
scpsize = scpsize * 2.9;
}else{
scpsize = scpsize * 3.9;
}
clearInterval( timer2 );
timer1= setInterval(''autoAdd()'',4300);
adding = 0;
chgStr();
}

function autoAdd(){
scpsize=scpsize+ (Math.random() * 0.5);
chgStr();
}


str021="Safe";
str022="<s>Euclid</s> Safe";
str023="<s>Keter</s> Safe";
str02x="";

str031= "SCP-280-JPはその移動できない性質のため、SCP-280-JPを中心に";
str032= "収容施設内は真空かつ光源のない電波暗室に保ってください。収容施設の入口は厳重に施錠し、民間人の立ち入りを防止してください。SCP-280-JPの利用を希望する職員は、サイト管理者へ所定の申請書を提出してください。";
str033="サイト-81██を建設します。";
str034="サイト-81██を建設します。";
str035="<s>エリア-81██に指定します</s> サイト-81██を建設します。";

str03e = "Due to the immobile property of SCP-280-JP, <s>the place centered around SCP-280-JP has been designated as Area-81██</s> Site-81██ has been erected at the place centered around SCP-280-JP. The interior of the containment facility is to be maintained as an RF anechoic chamber under vacuum without any light source. The entrance of the facility is to be locked tightly, and civilians are to be prevented from entering the facility. Staff wishing to use SCP-280-JP should submit a formal request to the Site Director.";


strInput1="<table border=''1'' bgcolor=''#EEEEEE'' width=''100%''><tr><td align=''left''>";

strInput2a="<b>管理担当者専用: </b>縮小用廃棄物投入プロトコルを実施する場合、次のボタンを押してください。<P align=''center''><input type=''button'' value=''プロトコル開始'' onClick=''addSize();'' id=''updbtn''></P>";

strInput2b="<b>管理担当者専用: </b>縮小用海水注入プロトコルを実施する場合、次のボタンを押してください。<p align=''center''><input type=''button'' value=''プロトコル開始'' onClick=''addSize();'' id=''updbtn''></P>";

strInput2c="<b>Only for Management Officer: </b>In order to initiate the seawater injection protocol for shrinking, click the following button.<p align=''center''><input type=''button'' value=''Initiate Protocol'' onClick=''addSize();'' id=''updbtn''></P>";

strInput2d="<p align=''center''><input type=''button'' value=''・・・・・'' onClick=''addSize();'' id=''updbtn''></P>";

strInput3="</td></tr></table>";

strInput00="<p align=''center'' word-break=''break-all''><input type=''button'' value=''電子媒体専用 管理I/F表示(要280-JPクリアランス)'' onClick=''viewAdmin();'' id=''updbtn''></P>";


str042="<P>SCP-280-JPは物質、電磁波、音など、接触したあらゆるものを消失させる特性を持っています。現在まで消失した物質の追跡調査は成功していません。SCP-280-JPは消失させた物質の質量に応じてその直径を縮小させます。またSCP-280-JPは空気や電磁波にも反応して縮小するため、現在の直径を維持するために収容施設は真空、暗闇、電波暗室である必要があります。</P>";

str043a="<P>SCP-280-JPは長野県██山中の洞窟内で発見されました。██山で発生した特殊性のない遭難者の捜索中にSCP-280-JPが発見され、通報を受けたエージェントを通じて財団により存在を確認、収容が実施されました。";

str043b="SCP-280-JPは長野県██山の崩落により発見されました。崩落は安定状態にあった██山の土壌がなんらかの原因でバランスが崩れ、山中に埋没していたSCP-280-JPに土壌が接触、消失したことにより発生したものとみられています。SCP-280-JPの発見直後、通報を受けたエージェントを通じて財団に存在が確認され、収容が実施されました。";

str043c="SCP-280-JPは長野県██地方の山間部消失という大規模災害により発見されました。SCP-280-JPがどのようにして出現したかは判明していません。██地方周辺は火山性有毒ガスの群発地域に偽装され、SCP-280-JPの縮小プログラムが開始されました。プログラムは有効に作用し、SCP-280-JPは現在のサイズまで縮小されました。";

str043d= "SCP-280-JPは当初日本の国土のおよそ██%に食い込むようにして存在していました。SCP-280-JPは古来より時空間の歪みとして民間人にも広く認知されていましたが、19██年、財団による管理および指示のもとで、公的には日本政府により対策プログラムを実行しました。プログラムは有効に作用し、SCP-280-JPは現在のサイズまで縮小されました。SCP-280-JPがどのようにして出現したかは判明していません。またSCP-280-JPは特性と危険性が明確であるにも関わらず、なぜ現在まで有効な対策がとられてこなかったか、論理的説明がつかないことから、現実改変の産物である可能性が示唆されています。";

str043z="<P>SCP-280-JPは物質の硬度を無視した切削作業が可能です。サイト管理者の許可を得ることでSCP-280-JPを用いた実験または加工を行うことが認められます。</P>"



chgStr();

function chgStr(){

  strsize = scpsize.toFixed(1);

  if( scpsize < limen3 ){
    objName = "SCP-280-JP";
  }else if( scpsize < limen4 ){
    objName = "SCP-280-JP";
  }else{
    objName = "SCP-280-JP";
  }

  str01a="test";
  str02a="test";
  str03a="test";
  str04a="test";
  str05a="test"
  strInput = "";


str041="SCP-280-JPは直径0.7m(" + year + "/" + month + "/" + date + "現在)の球状の時空間異常です。発見時の直径は"+ strsize +"mでしたが、財団による収容後の措置により現在の直径まで縮小することに成功しました。</P>";


str04e="SCP-280-JP is a spherical space-time anomaly which has a diameter of 0.7 m (As of " + month + "/" + date + "/" + year + "). It had a diameter of "+ strsize +" m at time of discovery, and it has been reduced to the current size due to the Foundation''s countermeasures after containment.</p><P>SCP-280-JP is hovering over the Zipangu island of the People’s Republic of China, located at 36°39’ N, 138°10’ E and the altitude of ██ km. There is an orbicular hole in the island, and it is considered to have been dug by SCP-280-JP at the time of manifestation. In 19██, the sluices were built on the island, and SCP-280-JP was shrunk to the manageable size by the seawater injection.</p><p>SCP-280-JP has the characteristic that whatever touches it disappears, such as matter, electromagnetic waves, and sounds. Surveys by tracing of the disappeared matter have as of yet been unsuccessful. SCP-280-JP reduces its own diameter by mass of the erased objects. Additionally, SCP-280-JP shrinks in response to air and electromagnetic waves; therefore the containment facility must be an RF anechoic chamber without light and air to keep the current diameter.</p><p>SCP-280-JP allows cutting operations ignoring hardness of matter. By permission from the Site Director, experiments and cutting operations will be available.</p>";

str04x=strsize + "</p>";


if( scpsize < limen1 ){
  // 最小(Safe)
  if( level == 0 ){
    level = 1;
    uplevel=1;
  }
  str02a=str021;
  str01a=objName;
  str03a=str031 + str033 + str032;
  str04a=str041 + str043a + str042 + str043z;
  strInput = strInput1 + strInput2a + strInput3;
  imgsrc = imgsrc1.src;
}else if( scpsize < limen2 ){
  // Euclid
  if( level == 1 ){
    level = 2;
    uplevel=1;
  }
  str02a=str022;
  str01a=objName;
  str03a=str031 + str033 + str032;
  str04a=str041 + str043b + str042 + str043z;
  strInput = strInput1 + strInput2a + strInput3;
  imgsrc = imgsrc2.src;
}else if( scpsize < limen3 ){
  // Keter
  if( level == 2 ){
    level = 3;
    uplevel=1;
  }
  str02a=str022;
  str01a=objName;
  str03a=str031 + str034 + str032;
  str04a=str041 + str043c + str042 + str043z;
  strInput = strInput1 + strInput2b + strInput3;
  imgsrc = imgsrc3.src;
}else if( scpsize < limen4 ){
  // Keter(SCP-280-JP)
  if( level == 3 ){
    level = 4;
    uplevel=1;
  }
  str02a=str023;
  str01a=objName;
  str03a=str031 + str035 + str032;
  str04a=str041 + str043d + str042 + str043z;
  strInput = strInput1 + strInput2b + strInput3;
  imgsrc = imgsrc4.src;
}else if( scpsize < limen5 ){
  // Keter(SCP-280-JP(en))
  if( level == 4 ){
    level = 5;
    uplevel=1;
  }
  str02a=str023;
  str01a=objName;
  str03a=str03e;
  str04a=str04e;
  strInput = strInput1 + strInput2c + strInput3;
  imgsrc = imgsrc5.src;
}else if( scpsize < limen6 ){
  // (nul)
  if( level == 5 ){
    level = 6;
    uplevel=1;
  }
  str02a=str02x;
  str01a="";
  str03a="";
  str04a=str04x;
  strInput = strInput2d;
  imgsrc = imgsrc6.src;
}else{
  // 白紙
  if( level == 6 ){
    level = 7;
    uplevel=1;
  }
}

if( viewbtn == 0 ){
  strInput = strInput00;
}

if( scpsize < limen4 ){
  str010="<p><b>アイテム番号:</b> ";
  str020="<p><b>オブジェクトクラス:</b> ";
  str030="</p><p><b>特別収容プロトコル:</b> ";
  str040="</p><p><b>説明:</b> ";
}else{
  str010="<p><b>Item #:</b> ";
  str020="<p><b>Object Class:</b> ";
  str030="</p><p><b>Special Containment Procedures:</b> ";
  str040="</p><p><b>Description:</b> ";
}

if( scpsize >= limen6 ){
  // すべて削除
  document.getElementById("testjs2").innerHTML="<font color=''#ffffff''></font>"
}else{
  // 表示
  document.getElementById("testjs2").innerHTML= str010 + str01a + "</p>" + str020 + str02a + str030 + str03a + strInput + str040+ str04a;
  if( adding == 1 ){
    document.getElementById("updbtn").disabled = true;
    if( scpsize < limen5 ){
      document.getElementById("updbtn").value = "Please Wait...";
    }else if( scpsize < limen6 ){
      document.getElementById("updbtn").value = "・・・・・";
    }
  }
}

if( uplevel == 1 ){
  document.getElementById("scpimg").src=imgsrc;
if( level == 7 ){
  document.getElementById("scpimgtbl").style.display = ''none'';
}
}
uplevel=0;
}
//-->

</script>
</link>
[[/html]]', 1);
INSERT OR REPLACE INTO pages (site_id, category, unix_name, title, source, owner_user_id) VALUES (1, 'credit', 'start', 'クレジット付き評価モジュール: start', '[[module css]]
@import url("https://scp-jp.github.io/files/util/common/credit/style/style.css");

.creditRate.no-rate .page-rate-widget-box {
    visibility:hidden;
}

.creditRate.creditModule.no-rate ~ #u-credit-view .creditBottomRate > div:nth-of-type(2) {
    display; none;
}
[[/module]]

[[div_ class="creditRate creditModule {$mode}"]]
[[div_ class="rateBox"]]
[[div_ class="rate-box-with-credit-button"]]
[[module Rate]]
[[div_ class="creditButton"]]
[[a href="#u-credit-view" class="fa fa-info" style="position:relative;"]][[image http://scp-jp.wikidot.com/local--files/nav:side/blank.png title="クレジットを表示する" style="position:absolute;height:100%;width:100%;top:0;left:0;"]][[/a]]
[[/div]]
[[/div]]
[[/div]]
[[/div]]

[[div_ style="clear:both;"]]
[[/div]]

[[div_ id="credit-view"]]
[[div_ class="fader"]]
[[iframe https://scp-jp.github.io/files/util/common/credit/backmodule/start.html ]]
[[/div]]

[[div_ class="modalcontainer"]]
[[div_ class="modalbox"]]
[[div_ class="modalbox-title"]]
++* クレジット
[[/div]]
[[div class="credit"]]
', 1);
INSERT OR REPLACE INTO pages (site_id, category, unix_name, title, source, owner_user_id) VALUES (1, 'credit', 'end', 'クレジット付き評価モジュール: end', '[[div_ class="credit-back" style="text-align: center;"]]
[[iframe https://scp-jp.github.io/files/util/common/credit/backmodule/end.html style="height:2em;width: 100%;margin: 0;padding: 0;border: 0;background: transparent;" scrolling="no"]]
[[/div]]
[[/div]]

[[div_ class="creditBottomRate" style="height:30px;"]]
[[div_ class="credit-license"]]
[[a href="*https://creativecommons.org/licenses/by-sa/3.0/deed.ja" class="cc cc-by-sa"]]@@@@[[/a]]
[[/div]]
[[div_ style="text-align: center; top: 0px;"]]
[[div_]]
[[module Rate]]
[[/div]]
[[/div]]
[[/div]]
[[/div]]
[[/div]]
[[/div]]
', 1);

INSERT OR IGNORE INTO page_tags (page_id, tag) VALUES ((SELECT page_id FROM pages WHERE unix_name = 'main'), 'jp');
INSERT OR IGNORE INTO page_tags (page_id, tag) VALUES ((SELECT page_id FROM pages WHERE unix_name = 'main'), 'hub');
INSERT OR IGNORE INTO page_tags (page_id, tag) VALUES ((SELECT page_id FROM pages WHERE unix_name = 'main'), '管理');
INSERT OR IGNORE INTO page_tags (page_id, tag) VALUES ((SELECT page_id FROM pages WHERE unix_name = 'scp-280-jp'), 'jp');
INSERT OR IGNORE INTO page_tags (page_id, tag) VALUES ((SELECT page_id FROM pages WHERE unix_name = 'scp-280-jp'), 'safe');
INSERT OR IGNORE INTO page_tags (page_id, tag) VALUES ((SELECT page_id FROM pages WHERE unix_name = 'scp-280-jp'), 'scp');
INSERT OR IGNORE INTO page_tags (page_id, tag) VALUES ((SELECT page_id FROM pages WHERE unix_name = 'scp-280-jp'), 'インターナショナル');
INSERT OR IGNORE INTO page_tags (page_id, tag) VALUES ((SELECT page_id FROM pages WHERE unix_name = 'scp-280-jp'), '時間');
INSERT OR IGNORE INTO page_tags (page_id, tag) VALUES ((SELECT page_id FROM pages WHERE unix_name = 'scp-280-jp'), '殿堂入り');
INSERT OR IGNORE INTO page_tags (page_id, tag) VALUES ((SELECT page_id FROM pages WHERE unix_name = 'scp-280-jp'), '球体');
INSERT OR IGNORE INTO page_tags (page_id, tag) VALUES ((SELECT page_id FROM pages WHERE unix_name = 'scp-280-jp'), '空間');
