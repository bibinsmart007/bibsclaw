export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  retryOn?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 30000,
  jitter: true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: Partial<RetryOptions> = {}
): Promise<T> {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (options.retryOn && !options.retryOn(lastError)) throw lastError;
      if (attempt === options.maxRetries) break;
      const delay = Math.min(
        options.baseDelayMs * Math.pow(2, attempt),
        options.maxDelayMs
      );
      const jitter = options.jitter ? Math.random() * delay * 0.2 : 0;
      await sleep(delay + jitter);
    }
  }
  throw lastError;
}

export function isRetryableError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("network") ||
    msg.includes("econnreset") ||
    msg.includes("socket hang up")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryableApiClient {
  constructor(private opts: Partial<RetryOptions> = {}) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    return withRetry(fn, { retryOn: isRetryableError, ...this.opts });
  }
}
