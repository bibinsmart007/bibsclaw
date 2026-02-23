export interface CorsOptions {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.DASHBOARD_URL || "",
].filter(Boolean);

export class CorsConfig {
  private options: CorsOptions;

  constructor(opts?: Partial<CorsOptions>) {
    this.options = {
      allowedOrigins: opts?.allowedOrigins || DEFAULT_ORIGINS,
      allowedMethods: opts?.allowedMethods || ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: opts?.allowedHeaders || ["Content-Type", "Authorization", "X-Request-ID"],
      credentials: opts?.credentials ?? true,
      maxAge: opts?.maxAge ?? 86400,
    };
  }

  isOriginAllowed(origin: string): boolean {
    if (this.options.allowedOrigins.includes("*")) return true;
    return this.options.allowedOrigins.includes(origin);
  }

  getHeaders(origin: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.isOriginAllowed(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    headers["Access-Control-Allow-Methods"] = this.options.allowedMethods.join(", ");
    headers["Access-Control-Allow-Headers"] = this.options.allowedHeaders.join(", ");
    if (this.options.credentials) headers["Access-Control-Allow-Credentials"] = "true";
    headers["Access-Control-Max-Age"] = String(this.options.maxAge);
    return headers;
  }

  addOrigin(origin: string): void {
    if (!this.options.allowedOrigins.includes(origin)) {
      this.options.allowedOrigins.push(origin);
    }
  }

  removeOrigin(origin: string): void {
    this.options.allowedOrigins = this.options.allowedOrigins.filter((o) => o !== origin);
  }
}
