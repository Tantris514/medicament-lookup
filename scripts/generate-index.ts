import { readdir, stat, mkdir, copyFile, writeFile } from "node:fs/promises";
import { join, relative, extname, basename, dirname } from "node:path";

interface PdfEntry {
  name: string;
  path: string;
  category: string;
  breadcrumb: string[];
  size: number;
}

interface TreeNode {
  name: string;
  path?: string;
  children?: TreeNode[];
}

const ROOT = join(import.meta.dirname, "..");
const ONCO_SRC = join(ROOT, "ONCO");
const PUBLIC = join(ROOT, "public");
const ONCO_DEST = join(PUBLIC, "ONCO");

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function cleanPath(segments: string[]): string {
  return segments.map(cleanName).join("/");
}

async function walk(
  dir: string,
  breadcrumb: string[] = []
): Promise<PdfEntry[]> {
  const entries: PdfEntry[] = [];
  const items = await readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = join(dir, item.name);

    if (item.isDirectory()) {
      const cleaned = cleanName(item.name);
      const subEntries = await walk(fullPath, [...breadcrumb, cleaned]);
      entries.push(...subEntries);
    } else if (
      item.isFile() &&
      extname(item.name).toLowerCase() === ".pdf"
    ) {
      const cleaned = cleanName(item.name);
      const crumbs = [...breadcrumb, cleaned.replace(/\.pdf$/i, "")];
      const relPath = "ONCO/" + cleanPath([...breadcrumb, cleaned].slice(0));

      const stats = await stat(fullPath);
      entries.push({
        name: cleaned.replace(/\.pdf$/i, ""),
        path: relPath,
        category: breadcrumb[0] || "Autres",
        breadcrumb: crumbs,
        size: stats.size,
      });
    }
  }

  return entries;
}

function buildTree(entries: PdfEntry[]): TreeNode[] {
  const root: Map<string, TreeNode> = new Map();

  for (const entry of entries) {
    // Path like "ONCO/Cat/Sub/file.pdf" -> segments: ["Cat", "Sub", "file.pdf"]
    const segments = entry.path.replace(/^ONCO\//, "").split("/");
    let currentLevel = root;
    let currentChildren: TreeNode[] | undefined;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLast = i === segments.length - 1;

      if (!currentLevel.has(seg)) {
        const node: TreeNode = isLast
          ? { name: seg.replace(/\.pdf$/i, ""), path: entry.path }
          : { name: seg, children: [] };
        currentLevel.set(seg, node);
      }

      const node = currentLevel.get(seg)!;
      if (!isLast) {
        if (!node.children) node.children = [];
        // Convert children array to map for next level
        const childMap = new Map<string, TreeNode>();
        for (const child of node.children) {
          childMap.set(child.path || child.name, child);
        }
        currentLevel = childMap;
        currentChildren = node.children;

        // Sync back: we need to maintain the children array
        // We'll rebuild it from the map after
      }
    }
  }

  // Simpler approach: build tree directly
  return buildTreeSimple(entries);
}

function buildTreeSimple(entries: PdfEntry[]): TreeNode[] {
  const tree: TreeNode[] = [];

  function ensureDir(
    children: TreeNode[],
    name: string
  ): TreeNode {
    let node = children.find((n) => n.name === name && n.children);
    if (!node) {
      node = { name, children: [] };
      children.push(node);
    }
    return node;
  }

  for (const entry of entries) {
    const segments = entry.path.replace(/^ONCO\//, "").split("/");
    let currentChildren = tree;

    for (let i = 0; i < segments.length - 1; i++) {
      const dir = ensureDir(currentChildren, segments[i]);
      currentChildren = dir.children!;
    }

    currentChildren.push({
      name: entry.name,
      path: entry.path,
    });
  }

  // Sort recursively
  function sortNodes(nodes: TreeNode[]): void {
    nodes.sort((a, b) => {
      // Directories first
      if (a.children && !b.children) return -1;
      if (!a.children && b.children) return 1;
      return a.name.localeCompare(b.name, "fr");
    });
    for (const n of nodes) {
      if (n.children) sortNodes(n.children);
    }
  }
  sortNodes(tree);

  return tree;
}

async function copyPdfs(entries: PdfEntry[]): Promise<void> {
  // Read source files to build a map from clean path to original path
  const originals = await walkOriginal(ONCO_SRC);

  for (const entry of entries) {
    const destPath = join(PUBLIC, entry.path);
    const destDir = dirname(destPath);
    await mkdir(destDir, { recursive: true });

    // Find original file
    const origPath = originals.get(entry.path);
    if (origPath) {
      await copyFile(origPath, destPath);
    }
  }
}

async function walkOriginal(
  dir: string,
  breadcrumb: string[] = []
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const items = await readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = join(dir, item.name);

    if (item.isDirectory()) {
      const cleaned = cleanName(item.name);
      const sub = await walkOriginal(fullPath, [...breadcrumb, cleaned]);
      for (const [k, v] of sub) map.set(k, v);
    } else if (
      item.isFile() &&
      extname(item.name).toLowerCase() === ".pdf"
    ) {
      const cleaned = cleanName(item.name);
      const relPath =
        "ONCO/" + [...breadcrumb, cleaned].join("/");
      map.set(relPath, fullPath);
    }
  }

  return map;
}

async function main() {
  console.log("Scanning ONCO directory...");
  const entries = await walk(ONCO_SRC);
  console.log(`Found ${entries.length} PDFs`);

  const tree = buildTreeSimple(entries);
  const categories = [...new Set(entries.map((e) => e.category))].sort(
    (a, b) => a.localeCompare(b, "fr")
  );

  console.log(`Categories: ${categories.join(", ")}`);

  // Write index.json
  await mkdir(PUBLIC, { recursive: true });
  await writeFile(
    join(PUBLIC, "index.json"),
    JSON.stringify({ entries, tree, categories }, null, 0)
  );
  console.log("Written public/index.json");

  // Copy PDFs with clean paths
  console.log("Copying PDFs...");
  await copyPdfs(entries);
  console.log("Done!");
}

main().catch(console.error);
