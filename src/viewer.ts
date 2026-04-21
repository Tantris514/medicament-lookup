import type { PdfEntry, TreeNode } from "./types";
import { tagHTML, getTagClasses } from "./tags";

let landing: HTMLElement;
let pdfView: HTMLElement;
let categoryView: HTMLElement;
let breadcrumb: HTMLElement;
let pdfPath: HTMLElement;
let pdfFrame: HTMLIFrameElement;
let downloadBtn: HTMLAnchorElement;
let newTabBtn: HTMLAnchorElement;
let homeBtn: HTMLElement;

export function initViewer(): void {
  landing = document.getElementById("landing")!;
  pdfView = document.getElementById("pdf-view")!;
  categoryView = document.getElementById("category-view")!;
  breadcrumb = document.getElementById("breadcrumb")!;
  pdfPath = document.getElementById("pdf-path")!;
  pdfFrame = document.getElementById("pdf-frame") as HTMLIFrameElement;
  downloadBtn = document.getElementById("download-btn") as HTMLAnchorElement;
  newTabBtn = document.getElementById("newtab-btn") as HTMLAnchorElement;
  homeBtn = document.getElementById("home-btn")!;

  // Category back button
  document.getElementById("cat-back")!.addEventListener("click", () => {
    location.hash = "";
  });
}

function hideAll(): void {
  landing.classList.add("hidden");
  pdfView.classList.add("hidden");
  categoryView.classList.add("hidden");
}

export function showLanding(): void {
  hideAll();
  landing.classList.remove("hidden");
  homeBtn.classList.add("hidden");
  homeBtn.classList.remove("inline-flex");
  newTabBtn.classList.add("hidden");
  newTabBtn.classList.remove("inline-flex");
  downloadBtn.classList.add("hidden");
  downloadBtn.classList.remove("inline-flex");
}

export function showPdf(entry: PdfEntry): void {
  hideAll();
  pdfView.classList.remove("hidden");
  homeBtn.classList.remove("hidden");
  homeBtn.classList.add("inline-flex");
  newTabBtn.classList.remove("hidden");
  newTabBtn.classList.add("inline-flex");
  downloadBtn.classList.remove("hidden");
  downloadBtn.classList.add("inline-flex");

  // Breadcrumb
  const crumbs = entry.breadcrumb;
  breadcrumb.innerHTML =
    `<a href="#" class="text-indigo-600 hover:underline">Accueil</a>` +
    `<span class="mx-1 text-gray-300">/</span>` +
    `<a href="#cat:${escapeAttr(entry.category)}" class="text-indigo-600 hover:underline">${escapeHtml(entry.category)}</a>` +
    crumbs
      .slice(1)
      .map(
        (c, i, arr) =>
          `<span class="mx-1 text-gray-300">/</span><span class="${i === arr.length - 1 ? "text-gray-800 font-medium" : "text-gray-500"}">${escapeHtml(c)}</span>`
      )
      .join("");

  pdfPath.textContent = `./${entry.path}`;

  const url = `/${encodeURI(entry.path)}`;
  pdfFrame.src = url;

  downloadBtn.href = url;
  downloadBtn.download = entry.path.split("/").pop() ?? "document.pdf";
  newTabBtn.href = url;

  closeSidebar();
}

export function showCategory(
  category: string,
  entries: PdfEntry[],
  tree: TreeNode[],
  onSelectPdf: (path: string) => void
): void {
  hideAll();
  categoryView.classList.remove("hidden");
  homeBtn.classList.remove("hidden");
  homeBtn.classList.add("inline-flex");
  newTabBtn.classList.add("hidden");
  newTabBtn.classList.remove("inline-flex");
  downloadBtn.classList.add("hidden");
  downloadBtn.classList.remove("inline-flex");

  const catEntries = entries.filter((e) => e.category === category);
  const catTree = tree.find((t) => t.name === category);

  // Header
  const header = document.getElementById("cat-header")!;
  header.innerHTML = `
    <div class="flex items-center gap-3 mb-1">
      ${tagHTML(category)}
      <span class="text-sm text-gray-400">${catEntries.length} protocole${catEntries.length > 1 ? "s" : ""}</span>
    </div>
    <h2 class="text-2xl font-bold text-gray-800">${escapeHtml(category)}</h2>
  `;

  // Content: render the subtree as a nice file browser
  const content = document.getElementById("cat-content")!;
  if (catTree?.children) {
    content.innerHTML = renderCatNodes(catTree.children, category);
  } else {
    content.innerHTML = `<p class="text-gray-400">Aucun protocole trouvé.</p>`;
  }

  // Click handler for PDF links
  content.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest("[data-path]") as HTMLElement | null;
    if (link) {
      e.preventDefault();
      onSelectPdf(link.dataset.path!);
    }
  });
}

function renderCatNodes(nodes: TreeNode[], category: string, depth = 0): string {
  const folders = nodes.filter((n) => n.children);
  const files = nodes.filter((n) => !n.children);
  let html = "";

  // Render subfolders as sections
  for (const folder of folders) {
    html += `
      <div class="${depth > 0 ? "ml-4" : ""} mb-4">
        <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 ${depth > 0 ? "" : "text-base"}">
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          ${escapeHtml(folder.name)}
          <span class="text-xs font-normal text-gray-400">(${countFiles(folder)})</span>
        </h3>
        ${renderCatNodes(folder.children!, category, depth + 1)}
      </div>`;
  }

  // Render files as a grid
  if (files.length > 0) {
    html += `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 ${depth > 0 ? "ml-4" : ""} mb-4">`;
    for (const file of files) {
      const url = `/${encodeURI(file.path!)}`;
      html += `
        <div class="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 hover:border-indigo-300 hover:shadow-sm transition">
          <a data-path="${escapeAttr(file.path!)}" class="flex-1 flex items-center gap-2 cursor-pointer truncate">
            <svg class="h-5 w-5 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 18h12a2 2 0 002-2V6l-4-4H6a2 2 0 00-2 2v12a2 2 0 002 2zm5-12h2v4H9V6zm0 6h2v2H9v-2z"/></svg>
            <span class="text-sm text-gray-700 group-hover:text-indigo-600 truncate">${escapeHtml(file.name)}</span>
          </a>
          <a href="${url}" target="_blank" class="shrink-0 p-1 text-gray-400 hover:text-indigo-600 transition" title="Ouvrir dans un nouvel onglet">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
        </div>`;
    }
    html += `</div>`;
  }

  return html;
}

function countFiles(node: TreeNode): number {
  if (!node.children) return 1;
  return node.children.reduce((sum, child) => sum + countFiles(child), 0);
}

export function renderCategoryGrid(
  categories: string[],
  entries: { category: string }[],
  onCategory: (cat: string) => void
): void {
  const grid = document.getElementById("category-grid")!;
  grid.innerHTML = categories
    .map((cat) => {
      const count = entries.filter((e) => e.category === cat).length;
      return `<button data-cat="${escapeAttr(cat)}" class="group flex flex-col items-start rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md">
        ${tagHTML(cat)}
        <span class="mt-2 text-lg font-semibold text-gray-800 group-hover:text-indigo-600">${escapeHtml(cat)}</span>
        <span class="text-sm text-gray-400">${count} protocole${count > 1 ? "s" : ""}</span>
      </button>`;
    })
    .join("");

  grid.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("[data-cat]") as HTMLElement | null;
    if (btn) onCategory(btn.dataset.cat!);
  });
}

function closeSidebar(): void {
  const sidebar = document.getElementById("sidebar")!;
  const overlay = document.getElementById("sidebar-overlay")!;
  sidebar.classList.remove("open");
  overlay.classList.add("hidden");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
