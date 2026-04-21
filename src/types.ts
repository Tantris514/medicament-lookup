export interface PdfEntry {
  name: string;
  path: string;
  category: string;
  breadcrumb: string[];
  size: number;
}

export interface TreeNode {
  name: string;
  path?: string;
  children?: TreeNode[];
}

export interface IndexData {
  entries: PdfEntry[];
  tree: TreeNode[];
  categories: string[];
}
