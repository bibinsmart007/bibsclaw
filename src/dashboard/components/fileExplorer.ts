import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: Date;
  children?: FileNode[];
  isExpanded?: boolean;
  extension?: string;
  isHidden?: boolean;
}

export interface FileExplorerConfig {
  rootPath: string;
  showHidden: boolean;
  sortBy: "name" | "size" | "modified" | "type";
  sortOrder: "asc" | "desc";
  maxDepth: number;
  excludePatterns: string[];
}

const DEFAULT_CONFIG: FileExplorerConfig = {
  rootPath: process.cwd(),
  showHidden: false,
  sortBy: "name",
  sortOrder: "asc",
  maxDepth: 5,
  excludePatterns: ["node_modules", ".git", "dist", ".next", "__pycache__"],
};

const FILE_ICONS: Record<string, string> = {
  ts: "typescript", tsx: "react", js: "javascript", jsx: "react",
  py: "python", json: "json", md: "markdown", html: "html",
  css: "css", scss: "sass", yaml: "yaml", yml: "yaml",
  sql: "database", sh: "terminal", bash: "terminal",
  png: "image", jpg: "image", gif: "image", svg: "image",
  pdf: "pdf", zip: "archive", tar: "archive",
};

export class FileExplorer extends EventEmitter {
  private config: FileExplorerConfig;
  private fileTree: FileNode | null = null;
  private watchHandlers: Map<string, fs.FSWatcher> = new Map();

  constructor(config?: Partial<FileExplorerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async buildTree(dirPath?: string, depth: number = 0): Promise<FileNode> {
    const targetPath = dirPath || this.config.rootPath;
    const stats = fs.statSync(targetPath);
    const node: FileNode = {
      name: path.basename(targetPath),
      path: targetPath,
      type: stats.isDirectory() ? "directory" : "file",
      size: stats.size,
      modified: stats.mtime,
      extension: path.extname(targetPath).slice(1),
      isHidden: path.basename(targetPath).startsWith("."),
    };
    if (stats.isDirectory() && depth < this.config.maxDepth) {
      const entries = fs.readdirSync(targetPath);
      node.children = [];
      for (const entry of entries) {
        if (!this.config.showHidden && entry.startsWith(".")) continue;
        if (this.config.excludePatterns.some(p => entry === p)) continue;
        const childPath = path.join(targetPath, entry);
        try {
          const child = await this.buildTree(childPath, depth + 1);
          node.children.push(child);
        } catch {
          // Skip inaccessible files
        }
      }
      node.children = this.sortNodes(node.children);
    }
    if (depth === 0) {
      this.fileTree = node;
      this.emit("treeBuilt", node);
    }
    return node;
  }

  private sortNodes(nodes: FileNode[]): FileNode[] {
    const dirs = nodes.filter(n => n.type === "directory");
    const nodeFiles = nodes.filter(n => n.type === "file");
    const sortFn = (a: FileNode, b: FileNode) => {
      const order = this.config.sortOrder === "asc" ? 1 : -1;
      switch (this.config.sortBy) {
        case "size": return (a.size - b.size) * order;
        case "modified": return (a.modified.getTime() - b.modified.getTime()) * order;
        case "type": return (a.extension || "").localeCompare(b.extension || "") * order;
        default: return a.name.localeCompare(b.name) * order;
      }
    };
    return [...dirs.sort(sortFn), ...nodeFiles.sort(sortFn)];
  }

  getFileIcon(extension: string): string {
    return FILE_ICONS[extension] || "file";
  }

  async readFile(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, "utf-8");
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    fs.writeFileSync(filePath, content, "utf-8");
    this.emit("fileChanged", filePath);
  }

  async createFile(filePath: string): Promise<void> {
    fs.writeFileSync(filePath, "", "utf-8");
    this.emit("fileCreated", filePath);
  }

  async createDirectory(dirPath: string): Promise<void> {
    fs.mkdirSync(dirPath, { recursive: true });
    this.emit("directoryCreated", dirPath);
  }

  async deleteFile(filePath: string): Promise<void> {
    fs.unlinkSync(filePath);
    this.emit("fileDeleted", filePath);
  }

  getTree(): FileNode | null {
    return this.fileTree;
  }

  searchFiles(query: string): FileNode[] {
    const results: FileNode[] = [];
    const search = (node: FileNode) => {
      if (node.name.toLowerCase().includes(query.toLowerCase())) {
        results.push(node);
      }
      if (node.children) node.children.forEach(search);
    };
    if (this.fileTree) search(this.fileTree);
    return results;
  }

  getFileStats(): { totalFiles: number; totalDirs: number; totalSize: number } {
    let totalFiles = 0, totalDirs = 0, totalSize = 0;
    const count = (node: FileNode) => {
      if (node.type === "file") { totalFiles++; totalSize += node.size; }
      else { totalDirs++; }
      if (node.children) node.children.forEach(count);
    };
    if (this.fileTree) count(this.fileTree);
    return { totalFiles, totalDirs, totalSize };
  }

  destroy(): void {
    this.watchHandlers.forEach(w => w.close());
    this.watchHandlers.clear();
    this.removeAllListeners();
  }
}

export const fileExplorer = new FileExplorer();
