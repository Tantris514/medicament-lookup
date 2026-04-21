import type { TreeNode } from "./types";
import { tagHTML } from "./tags";

let treeContainer: HTMLElement;
let allDetails: HTMLDetailsElement[] = [];
let originalOrder: Map<HTMLElement, HTMLElement[]> = new Map();

export function initTree(
  tree: TreeNode[],
  onSelect: (path: string) => void
): void {
  treeContainer = document.getElementById("tree")!;
  treeContainer.innerHTML = renderNodes(tree, true);
  allDetails = Array.from(treeContainer.querySelectorAll("details"));

  // Save original child order for each parent so we can restore after filtering
  saveOriginalOrder();

  treeContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest("[data-path]") as HTMLElement | null;
    if (link) {
      e.preventDefault();
      const path = link.dataset.path!;
      onSelect(path);
    }
  });

  document.getElementById("expand-all")!.addEventListener("click", () => {
    allDetails.forEach((d) => (d.open = true));
  });
  document.getElementById("collapse-all")!.addEventListener("click", () => {
    allDetails.forEach((d) => (d.open = false));
  });

  const filterInput = document.getElementById("tree-filter") as HTMLInputElement;
  filterInput.addEventListener("input", () => {
    const q = filterInput.value.toLowerCase().trim();
    filterTree(q);
  });
}

function renderNodes(nodes: TreeNode[], isRoot = false): string {
  return nodes
    .map((node) => {
      if (node.children) {
        const count = countPdfs(node);
        return `<details${isRoot ? " open" : ""} class="tree-folder">
          <summary class="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-gray-100">
            <span class="flex-1 truncate">${escapeHtml(node.name)}</span>
            ${isRoot ? tagHTML(node.name) : ""}
            <span class="text-xs text-gray-400">${count}</span>
          </summary>
          <div class="ml-3 border-l border-gray-100 pl-1">
            ${renderNodes(node.children)}
          </div>
        </details>`;
      } else {
        return `<a data-path="${escapeAttr(node.path!)}" class="tree-item flex items-center gap-1.5 rounded px-2 py-1 cursor-pointer hover:bg-gray-100 truncate" title="${escapeAttr(node.name)}">
          <svg class="h-3.5 w-3.5 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 18h12a2 2 0 002-2V6l-4-4H6a2 2 0 00-2 2v12a2 2 0 002 2zm5-12h2v4H9V6zm0 6h2v2H9v-2z"/></svg>
          <span class="truncate">${escapeHtml(node.name)}</span>
        </a>`;
      }
    })
    .join("");
}

function countPdfs(node: TreeNode): number {
  if (!node.children) return 1;
  return node.children.reduce((sum, child) => sum + countPdfs(child), 0);
}

function filterTree(query: string): void {
  if (!query) {
    treeContainer.querySelectorAll("[style]").forEach((el) => {
      (el as HTMLElement).style.display = "";
    });
    treeContainer.querySelectorAll(".tree-exact-match").forEach((el) => {
      el.classList.remove("tree-exact-match");
    });
    // Restore original alphabetical order
    restoreOrder();
    return;
  }

  // Show/hide based on match
  const items = treeContainer.querySelectorAll(".tree-item, .tree-folder");
  const visibleFolders = new Set<HTMLElement>();

  // First pass: show/hide leaf items, score them for sorting
  const scored: { el: HTMLElement; score: number; parent: HTMLElement }[] = [];

  treeContainer.querySelectorAll<HTMLElement>(".tree-item").forEach((el) => {
    const name = el.textContent?.trim().toLowerCase() ?? "";
    let score = -1; // no match
    if (name === query) score = 0; // exact
    else if (name.startsWith(query)) score = 1; // starts with
    else if (name.includes(query)) score = 2; // contains

    const matches = score >= 0;
    el.style.display = matches ? "" : "none";
    el.classList.remove("tree-exact-match");
    if (score === 0) el.classList.add("tree-exact-match");

    if (matches) {
      scored.push({ el, score, parent: el.parentElement! });
      // Mark all parent folders visible
      let parent = el.parentElement;
      while (parent && parent !== treeContainer) {
        if (parent.tagName === "DETAILS") {
          visibleFolders.add(parent as HTMLElement);
          (parent as HTMLDetailsElement).open = true;
        }
        parent = parent.parentElement;
      }
    }
  });

  // Re-order items within each parent: exact first, then startsWith, then contains
  const byParent = new Map<HTMLElement, typeof scored>();
  for (const item of scored) {
    if (!byParent.has(item.parent)) byParent.set(item.parent, []);
    byParent.get(item.parent)!.push(item);
  }
  for (const [parent, items] of byParent) {
    items.sort((a, b) => a.score - b.score);
    for (const { el } of items) {
      parent.appendChild(el);
    }
  }

  // Second pass: show/hide folders
  treeContainer.querySelectorAll<HTMLElement>("details.tree-folder").forEach((el) => {
    el.style.display = visibleFolders.has(el) ? "" : "none";
  });
}

export function highlightActive(path: string): void {
  treeContainer.querySelectorAll(".tree-item-active").forEach((el) => {
    el.classList.remove("tree-item-active");
  });
  const el = treeContainer.querySelector(`[data-path="${CSS.escape(path)}"]`);
  if (el) {
    el.classList.add("tree-item-active");
    // Expand parent details
    let parent = el.parentElement;
    while (parent && parent !== treeContainer) {
      if (parent.tagName === "DETAILS") {
        (parent as HTMLDetailsElement).open = true;
      }
      parent = parent.parentElement;
    }
    el.scrollIntoView({ block: "nearest" });
  }
}

function saveOriginalOrder(): void {
  // For each container that holds tree-items, save the child order
  treeContainer.querySelectorAll<HTMLElement>(".border-l").forEach((container) => {
    originalOrder.set(container, Array.from(container.children) as HTMLElement[]);
  });
  // Also the root
  originalOrder.set(treeContainer, Array.from(treeContainer.children) as HTMLElement[]);
}

function restoreOrder(): void {
  for (const [parent, children] of originalOrder) {
    for (const child of children) {
      parent.appendChild(child);
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
