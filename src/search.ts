import Fuse from "fuse.js";
import type { PdfEntry } from "./types";
import { tagHTML } from "./tags";

let fuse: Fuse<PdfEntry>;
let allEntries: PdfEntry[];
let input: HTMLInputElement;
let results: HTMLElement;
let onSelect: (path: string) => void;
let debounceTimer: ReturnType<typeof setTimeout>;

export function initSearch(
  entries: PdfEntry[],
  selectCallback: (path: string) => void
): void {
  onSelect = selectCallback;
  allEntries = entries;
  input = document.getElementById("search-input") as HTMLInputElement;
  results = document.getElementById("search-results")!;

  fuse = new Fuse(entries, {
    keys: [
      { name: "name", weight: 2 },
      { name: "category", weight: 1 },
      { name: "path", weight: 0.5 },
    ],
    threshold: 0.35,
    includeMatches: true,
    minMatchCharLength: 2,
  });

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(input.value), 150);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideResults();
      input.blur();
    }
  });

  // Ctrl+K shortcut
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  // Click outside to close
  document.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest("#search-input, #search-results")) {
      hideResults();
    }
  });

  results.addEventListener("click", (e) => {
    const item = (e.target as HTMLElement).closest("[data-path]") as HTMLElement | null;
    if (item) {
      onSelect(item.dataset.path!);
      hideResults();
      input.value = "";
    }
  });
}

function search(query: string): void {
  const q = query.trim();
  if (q.length < 2) {
    hideResults();
    return;
  }

  const qLower = q.toLowerCase();

  // Exact / startsWith / contains matches first (case-insensitive)
  const exact: PdfEntry[] = [];
  const startsWith: PdfEntry[] = [];
  const contains: PdfEntry[] = [];
  const seenPaths = new Set<string>();

  for (const entry of allEntries) {
    const nameLower = entry.name.toLowerCase();
    if (nameLower === qLower) {
      exact.push(entry);
      seenPaths.add(entry.path);
    } else if (nameLower.startsWith(qLower)) {
      startsWith.push(entry);
      seenPaths.add(entry.path);
    } else if (nameLower.includes(qLower)) {
      contains.push(entry);
      seenPaths.add(entry.path);
    }
  }

  // Then fuzzy results (excluding already matched)
  const fuseHits = fuse.search(q, { limit: 20 });
  const fuzzyItems = fuseHits
    .filter((h) => !seenPaths.has(h.item.path))
    .map((h) => h.item);

  const ordered = [...exact, ...startsWith, ...contains, ...fuzzyItems].slice(0, 20);

  if (ordered.length === 0) {
    results.innerHTML = `<div class="px-4 py-3 text-sm text-gray-400">Aucun résultat pour «&nbsp;${escapeHtml(q)}&nbsp;»</div>`;
    results.classList.remove("hidden");
    return;
  }

  // Build a map of fuse matches for highlighting
  const fuseMatchMap = new Map(fuseHits.map((h) => [h.item.path, h.matches]));

  results.innerHTML = ordered
    .map((item) => {
      const matches = fuseMatchMap.get(item.path);
      const highlighted = matches
        ? highlightMatches(item.name, matches, "name")
        : highlightSubstring(item.name, q);
      const url = `/${encodeURI(item.path)}`;
      return `
        <div class="group flex items-center gap-2 px-4 py-2 hover:bg-indigo-50 border-b border-gray-50 last:border-0">
          <button data-path="${escapeAttr(item.path)}" class="flex-1 min-w-0 text-left cursor-pointer">
            <div class="text-sm font-medium text-gray-800">${highlighted}</div>
            <div class="text-xs text-gray-400 truncate">${escapeHtml(item.breadcrumb.join(" › "))}</div>
          </button>
          <div class="flex items-center gap-2">
            ${tagHTML(item.category)}
            <a href="${url}" target="_blank" class="shrink-0 p-1 text-gray-400 hover:text-indigo-600 transition" title="Ouvrir dans un nouvel onglet">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          </div>
        </div>`;
    })
    .join("");
  results.classList.remove("hidden");
}

function highlightSubstring(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(text);
  return (
    escapeHtml(text.slice(0, idx)) +
    `<mark>${escapeHtml(text.slice(idx, idx + query.length))}</mark>` +
    escapeHtml(text.slice(idx + query.length))
  );
}

function highlightMatches(
  text: string,
  matches: readonly Fuse.FuseResultMatch[] | undefined,
  key: string
): string {
  if (!matches) return escapeHtml(text);
  const match = matches.find((m) => m.key === key);
  if (!match?.indices) return escapeHtml(text);

  // Merge overlapping indices
  const indices = [...match.indices].sort((a, b) => a[0] - b[0]);
  let result = "";
  let last = 0;
  for (const [start, end] of indices) {
    result += escapeHtml(text.slice(last, start));
    result += `<mark>${escapeHtml(text.slice(start, end + 1))}</mark>`;
    last = end + 1;
  }
  result += escapeHtml(text.slice(last));
  return result;
}

function hideResults(): void {
  results.classList.add("hidden");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
