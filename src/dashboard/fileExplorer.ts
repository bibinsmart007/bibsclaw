// File Explorer Panel - Phase 4.1
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modified?: Date;
}

export class FileExplorer {
  private root: FileNode | null = null;
  private expanded: Set<string> = new Set();

  setRoot(node: FileNode): void { this.root = node; }
  getRoot(): FileNode | null { return this.root; }
  toggleExpand(path: string): void {
    if (this.expanded.has(path)) this.expanded.delete(path);
    else this.expanded.add(path);
  }
  isExpanded(path: string): boolean { return this.expanded.has(path); }
  search(query: string): FileNode[] {
    const results: FileNode[] = [];
    const walk = (node: FileNode) => {
      if (node.name.toLowerCase().includes(query.toLowerCase())) results.push(node);
      node.children?.forEach(walk);
    };
    if (this.root) walk(this.root);
    return results;
  }
}
