import { describe, it, expect, vi, beforeEach } from "vitest";
import { RateLimiter } from "../middleware/rateLimiter.js";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter(60000, 3); // 3 requests per minute
  });

  it("should allow requests under the limit", () => {
    const middleware = limiter.middleware();
    const req = { ip: "127.0.0.1" } as any;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should block requests over the limit", () => {
    const middleware = limiter.middleware();
    const req = { ip: "127.0.0.1" } as any;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    // Make 4 requests (limit is 3)
    for (let i = 0; i < 4; i++) {
      middleware(req, res, next);
    }

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Too many requests" })
    );
  });

  it("should reset after the window expires", () => {
    const middleware = limiter.middleware();
    const req = { ip: "127.0.0.1" } as any;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    // Use all 3 requests
    for (let i = 0; i < 3; i++) {
      middleware(req, res, next);
    }

    // Advance time past the window
    vi.advanceTimersByTime(61000);

    // Should allow again
    const next2 = vi.fn();
    middleware(req, res, next2);
    expect(next2).toHaveBeenCalled();
  });
});
