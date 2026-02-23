import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";

export interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
  savedPath?: string;
}

export interface UploadConfig {
  maxFileSize: number;
  maxFiles: number;
  allowedTypes: string[];
  uploadDir: string;
  autoUpload: boolean;
}

const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxFileSize: 50 * 1024 * 1024,
  maxFiles: 10,
  allowedTypes: ["*"],
  uploadDir: "./uploads",
  autoUpload: true,
};

export class DragDropUploader extends EventEmitter {
  private config: UploadConfig;
  private queue: UploadFile[] = [];
  private activeUploads: number = 0;
  private maxConcurrent: number = 3;

  constructor(config?: Partial<UploadConfig>) {
    super();
    this.config = { ...DEFAULT_UPLOAD_CONFIG, ...config };
    if (!fs.existsSync(this.config.uploadDir)) {
      fs.mkdirSync(this.config.uploadDir, { recursive: true });
    }
  }

  validateFile(name: string, size: number, type: string): { valid: boolean; error?: string } {
    if (size > this.config.maxFileSize) {
      return { valid: false, error: "File too large. Max: " + String(Math.round(this.config.maxFileSize / 1024 / 1024)) + "MB" };
    }
    if (this.config.allowedTypes[0] !== "*") {
      const ext = path.extname(name).toLowerCase();
      if (!this.config.allowedTypes.includes(ext) && !this.config.allowedTypes.includes(type)) {
        return { valid: false, error: "File type not allowed: " + ext };
      }
    }
    if (this.queue.length >= this.config.maxFiles) {
      return { valid: false, error: "Max files limit reached: " + String(this.config.maxFiles) };
    }
    return { valid: true };
  }

  addFile(name: string, size: number, type: string, data: Buffer): UploadFile {
    const validation = this.validateFile(name, size, type);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    const id = "upload_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const file: UploadFile = { id, name, size, type, progress: 0, status: "pending" };
    this.queue.push(file);
    this.emit("fileAdded", file);
    if (this.config.autoUpload) {
      this.processFile(file, data);
    }
    return file;
  }

  private async processFile(file: UploadFile, data: Buffer): Promise<void> {
    if (this.activeUploads >= this.maxConcurrent) {
      await new Promise<void>(resolve => {
        const check = () => {
          if (this.activeUploads < this.maxConcurrent) { resolve(); return; }
          setTimeout(check, 100);
        };
        check();
      });
    }
    this.activeUploads++;
    file.status = "uploading";
    this.emit("uploadStart", file);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueName = Date.now() + "_" + safeName;
      const savePath = path.join(this.config.uploadDir, uniqueName);
      const chunkSize = 64 * 1024;
      let written = 0;
      const writeStream = fs.createWriteStream(savePath);
      while (written < data.length) {
        const end = Math.min(written + chunkSize, data.length);
        const chunk = data.slice(written, end);
        writeStream.write(chunk);
        written = end;
        file.progress = Math.round((written / data.length) * 100);
        this.emit("uploadProgress", { file, progress: file.progress });
      }
      writeStream.end();
      file.status = "complete";
      file.savedPath = savePath;
      file.progress = 100;
      this.emit("uploadComplete", file);
    } catch (err) {
      file.status = "error";
      file.error = err instanceof Error ? err.message : "Upload failed";
      this.emit("uploadError", file);
    } finally {
      this.activeUploads--;
    }
  }

  getQueue(): UploadFile[] {
    return [...this.queue];
  }

  removeFile(id: string): void {
    this.queue = this.queue.filter(f => f.id !== id);
    this.emit("fileRemoved", id);
  }

  clearCompleted(): void {
    this.queue = this.queue.filter(f => f.status !== "complete");
    this.emit("clearedCompleted");
  }

  getUploadStats(): { total: number; completed: number; failed: number; totalSize: number } {
    return {
      total: this.queue.length,
      completed: this.queue.filter(f => f.status === "complete").length,
      failed: this.queue.filter(f => f.status === "error").length,
      totalSize: this.queue.reduce((sum, f) => sum + f.size, 0),
    };
  }
}

export const dragDropUploader = new DragDropUploader();
