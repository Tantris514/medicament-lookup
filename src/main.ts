import type { IndexData, PdfEntry } from "./types";
import { initTags } from "./tags";
import { initTree, highlightActive } from "./tree";
import { initViewer, showPdf, showLanding, showCategory, renderCategoryGrid } from "./viewer";
import { initSearch } from "./search";
import "./style.css";

let data: IndexData;
let entryMap: Map<string, PdfEntry>;

async function main(): Promise<void> {
  const res = await fetch("/index.json");
  data = await res.json();
  entryMap = new Map(data.entries.map((e) => [e.path, e]));

  // Init modules
  initTags(data.categories);
  initViewer();

  initTree(data.tree, (path) => {
    location.hash = encodeURI(path);
  });

  initSearch(data.entries, (path) => {
    location.hash = encodeURI(path);
  });

  // PDF count
  document.getElementById("pdf-count")!.textContent = `${data.entries.length} protocoles`;

  // Category grid on landing — navigate to category view
  renderCategoryGrid(data.categories, data.entries, (cat) => {
    location.hash = `cat:${encodeURIComponent(cat)}`;
  });

  // Sidebar toggle (mobile)
  const sidebar = document.getElementById("sidebar")!;
  const overlay = document.getElementById("sidebar-overlay")!;
  const toggle = document.getElementById("sidebar-toggle")!;

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("hidden");
  });
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.add("hidden");
  });

  // Disclaimer banner logic
  const disclaimer = document.getElementById("disclaimer")!;
  const closeDisclaimer = document.getElementById("close-disclaimer")!;
  
  if (localStorage.getItem("disclaimer-accepted") === "true") {
    disclaimer.classList.add("hidden");
  }

  closeDisclaimer.addEventListener("click", () => {
    disclaimer.classList.add("opacity-0", "-translate-y-full");
    setTimeout(() => {
      disclaimer.classList.add("hidden");
    }, 300);
    localStorage.setItem("disclaimer-accepted", "true");
  });

  // Hash routing
  window.addEventListener("hashchange", handleHash);
  handleHash();
}

function handleHash(): void {
  const hash = decodeURI(location.hash.slice(1));

  if (hash.startsWith("cat:")) {
    const cat = decodeURIComponent(hash.slice(4));
    if (data.categories.includes(cat)) {
      showCategory(cat, data.entries, data.tree, (path) => {
        location.hash = encodeURI(path);
      });
      return;
    }
  }

  if (hash && entryMap.has(hash)) {
    const entry = entryMap.get(hash)!;
    showPdf(entry);
    highlightActive(entry.path);
  } else {
    showLanding();
  }
}

main();
