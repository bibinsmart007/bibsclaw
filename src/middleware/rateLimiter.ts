import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs = 60 * 1000, maxRequests = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      const entry = this.store.get(key);

      if (!entry || now > entry.resetAt) {
        this.store.set(key, { count: 1, resetAt: now + this.windowMs });
        res.setHeader("X-RateLimit-Limit", this.maxRequests);
        res.setHeader("X-RateLimit-Remaining", this.maxRequests - 1);
        next();
        return;
      }

      entry.count++;
      const remaining = Math.max(0, this.maxRequests - entry.count);
      res.setHeader("X-RateLimit-Limit", this.maxRequests);
      res.setHeader("X-RateLimit-Remaining", remaining);

      if (entry.count > this.maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader("Retry-After", retryAfter);
        res.status(429).json({
          error: "Too many requests",
          retryAfter,
        });
        return;
      }

      next();
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}
