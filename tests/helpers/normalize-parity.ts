import serialize from "dom-serializer";
import type { ChildNode, Document, Element, ParentNode } from "domhandler";
import { isComment, isTag, isText, Text } from "domhandler";
import { removeElement, replaceElement, textContent } from "domutils";
import { parseDocument } from "htmlparser2";

// ブロックレベル要素の前後の空白はレンダリングされない（削除してよい）。
// インライン要素間・テキストに接する空白はスペース1つとして表示される（保持が必要）。
// brはブロック要素ではないが、直前の空白は行末空白・直後の空白は行頭空白として
// どちらも表示されない（Wikidotは<br />\nと改行文字付きで出力するため、この差を吸収する）
const BLOCK_ELEMENTS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "body",
  "br",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "legend",
  "li",
  "main",
  "menu",
  "nav",
  "ol",
  "optgroup",
  "option",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "ul",
]);

// 部分文字列一致だと"page-rate-widget-box-extra"のような別クラスまで誤除去するため、トークン単位で判定する
function hasClassToken(element: Element, token: string): boolean {
  const className = element.attribs["class"];
  if (className === undefined) {
    return false;
  }
  return className.split(/\s+/).includes(token);
}

// on*（onclick等）はWikidot固有のJSフックで描画結果に寄与しないため落とし、
// 残りを名前順に並べ替えて属性順序の差を吸収する
function normalizeAttributes(element: Element): void {
  const names = Object.keys(element.attribs)
    .filter((name) => !/^on/i.test(name))
    .sort();
  const sorted: Record<string, string> = {};
  for (const name of names) {
    // wdprはtarget="_blank"リンクへrel="noopener noreferrer"を意図的に付与する
    // （セキュリティ強化）。Wikidot実物には無く表示同等性に影響しないため除去して比較する
    if (name === "rel") {
      const tokens = (element.attribs[name] ?? "")
        .split(/\s+/)
        .filter((t) => t !== "" && t !== "noopener" && t !== "noreferrer");
      if (tokens.length === 0) {
        continue;
      }
      sorted[name] = tokens.join(" ");
      continue;
    }
    sorted[name] = element.attribs[name] ?? "";
  }
  element.attribs = sorted;
}

// テキスト空白の境界判定を安定させるため、コメントは先行パスで一括削除する
function removeComments(nodes: ChildNode[]): void {
  for (const node of nodes.slice()) {
    if (isComment(node)) {
      removeElement(node);
      continue;
    }
    if (isTag(node)) {
      removeComments(node.children);
    }
  }
}

// 隣（またはノードが親の端にあるときは親）がブロック文脈か。
// ブロック文脈に接する空白はブラウザがレンダリングしないため削除できる
function isBlockBoundary(sibling: ChildNode | null, parent: ParentNode): boolean {
  if (sibling === null) {
    return !isTag(parent) || BLOCK_ELEMENTS.has(parent.name);
  }
  return isTag(sibling) && BLOCK_ELEMENTS.has(sibling.name);
}

/**
 * HTMLの空白セマンティクスに沿ってテキストノードを正規化する。
 * ASCII空白の連続はスペース1つへ（&#160;等の非ASCII空白は表示に影響するため対象外）、
 * ブロック境界に接する空白は削除。全空白になったノードは除去する。
 */
function normalizeTextNode(node: Text): void {
  const parent = node.parent;
  // コメント除去などで隣接した同士のテキストは先にマージする
  // （"a "+" b"が2連スペースとして残るのを防ぐ。prevは正規化済みだが処理は冪等）
  const prev = node.prev;
  if (prev !== null && isText(prev)) {
    node.data = prev.data + node.data;
    removeElement(prev);
  }

  let data = node.data.replace(/[ \t\r\n\f]+/g, " ");
  if (parent !== null) {
    if (isBlockBoundary(node.prev, parent)) {
      data = data.replace(/^ /, "");
    }
    if (isBlockBoundary(node.next, parent)) {
      data = data.replace(/ $/, "");
    }
  }
  if (data === "") {
    removeElement(node);
    return;
  }
  node.data = data;
}

function transformChildren(nodes: ChildNode[], inPre: boolean): void {
  // removeElement/replaceElementが親のchildren配列を書き換えるため、コピーを走査する
  for (const node of nodes.slice()) {
    if (isText(node)) {
      // <pre>/<textarea>内は空白がそのまま表示されるため一切触らない
      if (!inPre) {
        normalizeTextNode(node);
      }
      continue;
    }
    if (!isTag(node)) {
      continue;
    }
    if (hasClassToken(node, "page-rate-widget-box")) {
      // Rate widgetは実サイトの投票実数 vs wdpr固定0の差しか生まないためsubtreeごと除去する
      removeElement(node);
      continue;
    }
    if (hasClassToken(node, "printuser")) {
      // [[user]]のユーザーリンク・アバターはオフライン解決不能のため、テキスト内容へ畳んで整合させる
      replaceElement(node, new Text(textContent(node)));
      continue;
    }
    if (node.name === "iframe" && hasClassToken(node, "html-block-iframe")) {
      // [[html]]ブロックのiframe srcはWikidot側がコンテンツハッシュ、wdpr側が独自IDで
      // オフラインでは一致させられないため、srcを固定値へ置換して存在のみ比較する
      node.attribs["src"] = "about:html-block";
    }
    normalizeAttributes(node);
    transformChildren(node.children, inPre || node.name === "pre" || node.name === "textarea");
  }
}

// 両側（Wikidot実HTMLとwdpr出力）を同じparse→transform→serialize往復に通すことで、
// 数値エンティティや引用符の表記差も自動的に統一される
function buildNormalizedDom(html: string): Document {
  const document = parseDocument(html);
  removeComments(document.children);
  transformChildren(document.children, false);
  return document;
}

/** parity比較用のHTML正規化。空白処理はDOMパスで完結しており、シリアライズ結果をそのまま比較に使う */
export function normalizeForParity(html: string): string {
  const document = buildNormalizedDom(html);
  return serialize(document, { encodeEntities: "utf8" }).trim();
}
