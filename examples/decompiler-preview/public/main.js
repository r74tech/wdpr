// --- Elements ---

const inputWikidot = document.getElementById("input-wikidot");
const inputHtml = document.getElementById("input-html");
const outputPreview = document.getElementById("output-preview");
const outputDecompiled = document.getElementById("output-decompiled");
const outputAst = document.getElementById("output-ast");

// --- Tab switching ---

let activeInputTab = "wikidot";

function setupTabs(pane, onSwitch) {
  const tabs = pane.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      onSwitch(tab.dataset.tab);
    });
  });
}

const inputPane = document.querySelector(".pane-input");
const outputPane = document.querySelector(".pane-output");

setupTabs(inputPane, (tab) => {
  activeInputTab = tab;
  inputWikidot.classList.toggle("hidden", tab !== "wikidot");
  inputHtml.classList.toggle("hidden", tab !== "html");
});

setupTabs(outputPane, (tab) => {
  outputPreview.classList.toggle("hidden", tab !== "preview");
  outputDecompiled.classList.toggle("hidden", tab !== "decompiled");
  outputAst.classList.toggle("hidden", tab !== "ast");
});

// --- Processing ---

let currentController = null;

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function processWikidot(source, signal) {
  try {
    const res = await fetch("/api/wikidot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
      signal,
    });
    const data = await res.json();
    if (signal.aborted) return;
    if (data.error) throw new Error(data.error);

    outputPreview.innerHTML = data.html;
    outputDecompiled.textContent = data.decompiled;
    outputAst.textContent = JSON.stringify(data.ast, null, 2);
  } catch (e) {
    if (e.name === "AbortError") return;
    outputPreview.innerHTML = `<span class="error">${escapeHtml(e.message)}</span>`;
    outputDecompiled.textContent = "";
    outputAst.textContent = "";
  }
}

async function processHtml(html, signal) {
  try {
    const res = await fetch("/api/html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
      signal,
    });
    const data = await res.json();
    if (signal.aborted) return;
    if (data.error) throw new Error(data.error);

    outputPreview.innerHTML = data.preview;
    outputDecompiled.textContent = data.decompiled;
    outputAst.textContent = JSON.stringify(data.ast, null, 2);
  } catch (e) {
    if (e.name === "AbortError") return;
    outputDecompiled.textContent = e.message;
    outputAst.textContent = "";
  }
}

function update() {
  if (currentController) currentController.abort();
  currentController = new AbortController();
  const { signal } = currentController;

  if (activeInputTab === "wikidot") {
    processWikidot(inputWikidot.value, signal);
  } else {
    processHtml(inputHtml.value, signal);
  }
}

// --- Debounced input ---

let timer;

function onInput() {
  clearTimeout(timer);
  timer = setTimeout(update, 200);
}

inputWikidot.addEventListener("input", onInput);
inputHtml.addEventListener("input", onInput);

// Initial render
update();
