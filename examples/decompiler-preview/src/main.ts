import "./style.css";
import DOMPurify from "dompurify";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { decompile } from "@wdprlib/decompiler";

// --- Elements ---

const inputWikidot = document.getElementById("input-wikidot") as HTMLTextAreaElement;
const inputHtml = document.getElementById("input-html") as HTMLTextAreaElement;
const outputPreview = document.getElementById("output-preview") as HTMLDivElement;
const outputDecompiled = document.getElementById("output-decompiled") as HTMLPreElement;
const outputAst = document.getElementById("output-ast") as HTMLPreElement;

// --- Tab switching ---

type InputTab = "wikidot" | "html";

let activeInputTab: InputTab = "wikidot";

function setupTabs(pane: Element, onSwitch: (tab: string) => void) {
  const tabs = pane.querySelectorAll<HTMLButtonElement>(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      onSwitch(tab.dataset.tab!);
    });
  });
}

const inputPane = document.querySelector(".pane-input")!;
const outputPane = document.querySelector(".pane-output")!;

setupTabs(inputPane, (tab) => {
  activeInputTab = tab as InputTab;
  inputWikidot.classList.toggle("hidden", tab !== "wikidot");
  inputHtml.classList.toggle("hidden", tab !== "html");
});

setupTabs(outputPane, (tab) => {
  outputPreview.classList.toggle("hidden", tab !== "preview");
  outputDecompiled.classList.toggle("hidden", tab !== "decompiled");
  outputAst.classList.toggle("hidden", tab !== "ast");
});

// --- Processing ---

function processWikidot(source: string) {
  try {
    const { ast } = parse(source);
    const html = renderToHtml(ast, { footnotes: ast.footnotes });

    outputPreview.innerHTML = html;
    outputDecompiled.textContent = decompile(html);
    outputAst.textContent = JSON.stringify(ast, null, 2);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    outputPreview.innerHTML = `<span class="error">${escapeHtml(msg)}</span>`;
    outputDecompiled.textContent = "";
    outputAst.textContent = "";
  }
}

function processHtml(html: string) {
  try {
    outputPreview.innerHTML = DOMPurify.sanitize(html);
    const wikidot = decompile(html);
    outputDecompiled.textContent = wikidot;

    const { ast } = parse(wikidot);
    outputAst.textContent = JSON.stringify(ast, null, 2);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    outputDecompiled.textContent = msg;
    outputAst.textContent = "";
  }
}

function update() {
  if (activeInputTab === "wikidot") {
    processWikidot(inputWikidot.value);
  } else {
    processHtml(inputHtml.value);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Debounced input ---

let timer: ReturnType<typeof setTimeout>;

function onInput() {
  clearTimeout(timer);
  timer = setTimeout(update, 200);
}

inputWikidot.addEventListener("input", onInput);
inputHtml.addEventListener("input", onInput);

// Initial render
update();
