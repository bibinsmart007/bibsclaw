// Drag & Drop Upload - Phase 4.1
export interface UploadConfig {
  maxSize: number;
  allowedTypes: string[];
  multiple: boolean;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data: ArrayBuffer | string;
}

export class DragDropUploader {
  private config: UploadConfig;
  constructor(config?: Partial<UploadConfig>) {
    this.config = { maxSize: 10 * 1024 * 1024, allowedTypes: ['*/*'], multiple: true, ...config };
  }
  validate(file: { name: string; size: number; type: string }): { valid: boolean; error?: string } {
    if (file.size > this.config.maxSize) return { valid: false, error: 'File too large' };
    if (this.config.allowedTypes[0] !== '*/*' && !this.config.allowedTypes.includes(file.type))
      return { valid: false, error: 'File type not allowed' };
    return { valid: true };
  }
}
