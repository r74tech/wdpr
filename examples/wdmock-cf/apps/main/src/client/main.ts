import { initWdprRuntime, type WdprRuntime } from "@wdpr/runtime";

let runtime: WdprRuntime | null = null;
let currentPageId: number | null = null;
let currentPagePath: string = "main";

// Manage page styles injected into <head>
const PAGE_STYLE_ATTR = "data-wdpr-page-style";

function applyPageStyles(styles: string[]) {
  // Remove previous page styles
  document.head.querySelectorAll(`style[${PAGE_STYLE_ATTR}]`).forEach((el) => el.remove());
  // Insert new styles in order
  for (const css of styles) {
    const style = document.createElement("style");
    style.setAttribute(PAGE_STYLE_ATTR, "");
    style.textContent = css;
    document.head.appendChild(style);
  }
}

/**
 * Safely set HTML content using a sandboxed approach.
 * The HTML is generated server-side by @wdpr/render which sanitizes user input.
 * We use a template element for parsing to avoid script execution during parsing.
 */
function setTrustedHtml(element: Element, html: string): void {
  // Use template element to parse HTML without executing scripts
  const template = document.createElement("template");
  template.innerHTML = html;
  element.replaceChildren(template.content);
}

async function loadPage(path: string) {
  currentPagePath = path;

  // Cleanup previous runtime
  if (runtime) {
    runtime.destroy();
    runtime = null;
  }

  // Exit editor mode if active
  hideEditor();

  const res = await fetch(`/api/page/${path}`);
  if (!res.ok) {
    const content = document.getElementById("page-content");
    if (content) {
      content.replaceChildren();
      const p = document.createElement("p");
      p.textContent = "Page not found.";
      content.appendChild(p);
    }
    currentPageId = null;
    applyPageStyles([]);
    updatePageOptions(false);
    return;
  }

  const data: {
    page_id: number;
    title: string;
    fullname: string;
    html: string;
    styles: string[];
  } = await res.json();

  applyPageStyles(data.styles ?? []);

  currentPageId = data.page_id;

  const titleEl = document.getElementById("page-title");
  if (titleEl) titleEl.textContent = data.title;

  const content = document.getElementById("page-content");
  if (!content) return;

  // Server-generated HTML from @wdpr/render (sanitized)
  setTrustedHtml(content, data.html);
  content.dataset.pageId = String(data.page_id);

  document.title = `${data.title} - WikidotMock`;

  updatePageOptions(true);

  // Init runtime for interactive elements
  runtime = initWdprRuntime({
    root: content as HTMLElement,
    onRate: async (_id, points) => {
      if (!currentPageId) return { points: 0, votes: 0, percent: 0 };
      const rateRes = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: currentPageId, points }),
      });
      return rateRes.json();
    },
  });
}

function updatePageOptions(pageExists: boolean) {
  const optionsBottom = document.getElementById("page-options-bottom");
  if (!optionsBottom) return;

  optionsBottom.replaceChildren();

  if (pageExists) {
    const editLink = document.createElement("a");
    editLink.id = "btn-edit";
    editLink.href = "javascript:;";
    editLink.textContent = "Edit";
    editLink.addEventListener("click", openEditor);

    const deleteLink = document.createElement("a");
    deleteLink.id = "btn-delete";
    deleteLink.href = "javascript:;";
    deleteLink.textContent = "Delete";
    deleteLink.addEventListener("click", deletePage);

    const sourceLink = document.createElement("a");
    sourceLink.id = "btn-view-source";
    sourceLink.href = "javascript:;";
    sourceLink.textContent = "View Source";
    sourceLink.addEventListener("click", viewSource);

    optionsBottom.appendChild(editLink);
    optionsBottom.appendChild(deleteLink);
    optionsBottom.appendChild(sourceLink);
  }

  // Close action-area when switching pages
  hideActionArea();
}

async function viewSource() {
  const res = await fetch(`/api/page-source/${currentPagePath}`);
  if (!res.ok) {
    alert("Failed to load source.");
    return;
  }

  const data: { source: string } = await res.json();
  showActionArea("Page Source", data.source);
}

function showActionArea(title: string, source: string) {
  const actionArea = document.getElementById("action-area");
  if (!actionArea) return;

  actionArea.replaceChildren();
  actionArea.style.display = "block";

  // Close button
  const closeBtn = document.createElement("a");
  closeBtn.href = "javascript:;";
  closeBtn.className = "action-area-close btn btn-danger";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", hideActionArea);

  // Title
  const h1 = document.createElement("h1");
  h1.textContent = title;

  // Source content (escape HTML and convert to visible format)
  const sourceDiv = document.createElement("div");
  sourceDiv.className = "page-source";
  sourceDiv.textContent = source;

  actionArea.appendChild(closeBtn);
  actionArea.appendChild(h1);
  actionArea.appendChild(sourceDiv);
}

function hideActionArea() {
  const actionArea = document.getElementById("action-area");
  if (actionArea) {
    actionArea.style.display = "none";
    actionArea.replaceChildren();
  }
}

function openNewPageDialog() {
  const slug = prompt("Page slug (e.g. 'my-page' or 'category:name'):");
  if (!slug) return;

  const cleanSlug = slug.replace(/^\/+|\/+$/g, "");
  if (!cleanSlug) return;

  history.pushState(null, "", `/${cleanSlug}`);
  currentPagePath = cleanSlug;
  currentPageId = null;

  const titleEl = document.getElementById("page-title");
  if (titleEl) titleEl.textContent = "";

  const content = document.getElementById("page-content");
  if (content) content.replaceChildren();

  showEditor("", cleanSlug);
}

async function openEditor() {
  const res = await fetch(`/api/page-source/${currentPagePath}`);
  if (!res.ok) {
    // Page doesn't exist yet, open empty editor
    showEditor("", currentPagePath);
    return;
  }

  const data: { title: string; source: string } = await res.json();
  showEditor(data.source, data.title);
}

function showEditor(source: string, titleValue: string) {
  const content = document.getElementById("page-content");
  if (!content) return;

  if (runtime) {
    runtime.destroy();
    runtime = null;
  }

  content.replaceChildren();

  // Build form using DOM API (safe)
  const form = document.createElement("div");
  form.id = "edit-page-form";

  // Title field
  const titleField = document.createElement("div");
  titleField.className = "edit-field";
  const titleLabel = document.createElement("label");
  titleLabel.htmlFor = "edit-title";
  titleLabel.textContent = "Title:";
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.id = "edit-title";
  titleInput.value = titleValue;
  titleField.appendChild(titleLabel);
  titleField.appendChild(titleInput);

  // Source field
  const sourceField = document.createElement("div");
  sourceField.className = "edit-field";
  const sourceLabel = document.createElement("label");
  sourceLabel.htmlFor = "edit-source";
  sourceLabel.textContent = "Page Source:";
  const sourceTextarea = document.createElement("textarea");
  sourceTextarea.id = "edit-source";
  sourceTextarea.rows = 20;
  sourceTextarea.value = source;
  sourceField.appendChild(sourceLabel);
  sourceField.appendChild(sourceTextarea);

  // Actions
  const actions = document.createElement("div");
  actions.className = "edit-actions";
  const saveBtn = document.createElement("button");
  saveBtn.id = "btn-save";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", savePage);
  const previewBtn = document.createElement("button");
  previewBtn.id = "btn-preview";
  previewBtn.textContent = "Preview";
  previewBtn.addEventListener("click", previewPage);
  const cancelBtn = document.createElement("button");
  cancelBtn.id = "btn-cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", cancelEdit);
  actions.appendChild(saveBtn);
  actions.appendChild(previewBtn);
  actions.appendChild(cancelBtn);

  // Preview area
  const previewArea = document.createElement("div");
  previewArea.id = "edit-preview-area";

  form.appendChild(titleField);
  form.appendChild(sourceField);
  form.appendChild(actions);
  form.appendChild(previewArea);
  content.appendChild(form);
}

function hideEditor() {
  const form = document.getElementById("edit-page-form");
  if (form) form.remove();
}

async function savePage() {
  const titleInput = document.getElementById("edit-title") as HTMLInputElement | null;
  const sourceInput = document.getElementById("edit-source") as HTMLTextAreaElement | null;
  if (!titleInput || !sourceInput) return;

  const title = titleInput.value.trim() || currentPagePath;
  const source = sourceInput.value;

  const res = await fetch(`/api/page/${currentPagePath}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, source }),
  });

  if (!res.ok) {
    alert("Failed to save page.");
    return;
  }

  // Reload the page to show rendered content
  await loadPage(currentPagePath);
  // Reload navigation in case nav pages were edited
  await loadNavigation();
}

async function previewPage() {
  const sourceInput = document.getElementById("edit-source") as HTMLTextAreaElement | null;
  const titleInput = document.getElementById("edit-title") as HTMLInputElement | null;
  if (!sourceInput || !titleInput) return;

  const title = titleInput.value.trim() || currentPagePath;
  const source = sourceInput.value;

  // Save temporarily to render preview
  const res = await fetch(`/api/page/${currentPagePath}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, source }),
  });

  if (!res.ok) {
    alert("Failed to generate preview.");
    return;
  }

  const data: { html: string } = await res.json();
  const previewArea = document.getElementById("edit-preview-area");
  if (previewArea) {
    previewArea.replaceChildren();
    const h3 = document.createElement("h3");
    h3.textContent = "Preview";
    const previewContent = document.createElement("div");
    previewContent.className = "preview-content";
    // Server-generated HTML from @wdpr/render (sanitized)
    setTrustedHtml(previewContent, data.html);
    previewArea.appendChild(h3);
    previewArea.appendChild(previewContent);
  }
}

function cancelEdit() {
  loadPage(currentPagePath);
}

async function deletePage() {
  if (!confirm("Are you sure you want to delete this page?")) return;

  const res = await fetch(`/api/page/${currentPagePath}`, { method: "DELETE" });
  if (!res.ok) {
    alert("Failed to delete page.");
    return;
  }

  history.pushState(null, "", "/main");
  await loadPage("main");
  await loadNavigation();
}

const NAV_STYLE_ATTR = "data-wdpr-nav-style";

function applyNavStyles(styles: string[]) {
  document.head.querySelectorAll(`style[${NAV_STYLE_ATTR}]`).forEach((el) => el.remove());
  for (const css of styles) {
    const style = document.createElement("style");
    style.setAttribute(NAV_STYLE_ATTR, "");
    style.textContent = css;
    document.head.appendChild(style);
  }
}

async function loadNavigation() {
  const [sidebarRes, topbarRes] = await Promise.all([fetch("/api/sidebar"), fetch("/api/topbar")]);

  const navStyles: string[] = [];

  if (sidebarRes.ok) {
    const { html, styles } = (await sidebarRes.json()) as { html: string; styles?: string[] };
    const sidebar = document.getElementById("side-bar");
    if (sidebar) {
      // Preserve the actions section, replace only nav content
      const actionsSection = sidebar.querySelector("#side-bar-actions");
      // Clone the actions section to preserve it after replaceChildren
      const actionsClone = actionsSection?.cloneNode(true) as HTMLElement | null;
      // Server-generated HTML from @wdpr/render (sanitized)
      setTrustedHtml(sidebar, html);
      // Re-add actions section at the beginning
      if (actionsClone) {
        sidebar.insertBefore(actionsClone, sidebar.firstChild);
        // Re-bind event listener
        actionsClone.querySelector("#btn-new-page")?.addEventListener("click", openNewPageDialog);
      }
    }
    if (styles) navStyles.push(...styles);
  }

  if (topbarRes.ok) {
    const { html, styles } = (await topbarRes.json()) as { html: string; styles?: string[] };
    const topbar = document.getElementById("top-bar");
    if (topbar) {
      // Server-generated HTML from @wdpr/render (sanitized)
      setTrustedHtml(topbar, html);
    }
    if (styles) navStyles.push(...styles);
  }

  applyNavStyles(navStyles);
}

function getPagePath(): string {
  const path = window.location.pathname.replace(/^\/+/, "");
  return path || "main";
}

// Handle internal link clicks
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const anchor = target.closest("a");
  if (!anchor) return;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("javascript:"))
    return;

  e.preventDefault();
  const pagePath = href.replace(/^\/+/, "") || "main";
  history.pushState(null, "", `/${pagePath}`);
  loadPage(pagePath);
});

window.addEventListener("popstate", () => {
  const newPath = getPagePath();
  // hash変更のみの場合は再読み込みしない
  if (newPath === currentPagePath) return;
  loadPage(newPath);
});

document.addEventListener("DOMContentLoaded", async () => {
  // Setup New Page button in sidebar
  document.getElementById("btn-new-page")?.addEventListener("click", openNewPageDialog);

  await loadNavigation();
  await loadPage(getPagePath());
});
